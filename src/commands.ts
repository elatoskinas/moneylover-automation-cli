import { AddTransactionRequest, GetCategoriesResponse, MoneyloverClient } from "./client";
import * as fs from 'fs';
import { BankParsingConfiguration, extractExcelTransactionsToFile, readTransactionsFromFile } from "./parsing";
import { SubmittableTransactionEntry } from "./data";

export interface DumpCategoriesRequest {
    outputPath: string;
}

export interface ParseExcelRequest {
    inputPath: string;
    outputPath: string;
}

export interface PostTransactionsRequest {
    inputPath: string;
}

export const dumpCategories = async(client: MoneyloverClient, request: DumpCategoriesRequest): Promise<void> => {
    const { outputPath } = request;

    const wallets = await client.getWallets();
    if (wallets.data.length === 0) {
        throw new Error('Could not find any wallets');
    }

    const [wallet] = wallets.data;
    console.log('Defaulting to first wallet:', wallet.name);

    const categories = await client.getCategories({
        walletId: wallet._id,
    });
    const categoryNames = categories.data.map((category) => category.name).join('\n');
    console.log(categoryNames);

    fs.writeFileSync(outputPath, categoryNames);
};

export const parseExcel = async(request: ParseExcelRequest) => {
    const { inputPath, outputPath } = request;
    extractExcelTransactionsToFile(inputPath, BankParsingConfiguration, outputPath);
}


const mapSubmittableTransactionsToClientRequests = (
    transactions: SubmittableTransactionEntry[],
    targetAccount: string,
    categories: GetCategoriesResponse['data'],
): AddTransactionRequest[] => {
    return transactions.map((transaction) => {
        const resolvedCategory = categories.find((category) => category.name === transaction.category);
        if (!resolvedCategory) {
            throw new Error(`Could not resolve category: ${transaction.category}`);
        }

        return {
            category: resolvedCategory._id,
            account: targetAccount,
            amount: Math.abs(transaction.amount),
            displayDate: transaction.date,
            note: transaction.description,
        };
    });
};

const writeProcessedTransaction = (transactions: SubmittableTransactionEntry[], processedTransactionIndex: number, inputPath: string): void => {
    transactions[processedTransactionIndex] = {
        ...transactions[processedTransactionIndex],
        isProcessed: true,
    };
    fs.writeFileSync(inputPath, JSON.stringify(transactions, undefined, 4));
}

export const postTransactions = async(client: MoneyloverClient, request: PostTransactionsRequest) => {
    const { inputPath } = request;
    const transactions = readTransactionsFromFile(inputPath).slice(0, 2).filter((transaction) => {
        return !transaction.isProcessed;
    });

    const wallets = await client.getWallets();
    if (wallets.data.length === 0) {
        throw new Error('Could not find any wallets');
    }

    const [wallet] = wallets.data;
    console.log('Defaulting to first wallet:', wallet.name);

    const categories = await client.getCategories({
        walletId: wallet._id,
    });

    const requests = mapSubmittableTransactionsToClientRequests(transactions, wallet._id, categories.data);

    for (let i = 0; i < 1; ++i) {
        console.log(`Adding transaction... (${i+1}/${requests.length})`);
        await client.addTransaction(requests[i]);
        writeProcessedTransaction(transactions, i, inputPath);
    }
}
