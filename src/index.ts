import { AddTransactionRequest, MoneyloverClient } from './client';
import { SubmittableTransactionEntry } from './data';
import { BankParsingConfiguration, extractExcelTransactions, extractExcelTransactionsToFile, readTransactionsFromFile } from './parsing';

const mapSubmittableTransactionsToClientRequests = (
    transactions: SubmittableTransactionEntry[],
    targetAccount: string,
): AddTransactionRequest[] => {
    return transactions.map((transaction) => ({
        category: transaction.category,
        account: targetAccount,
        amount: transaction.amount,
        displayDate: transaction.date,
        note: transaction.description,
    }));
};

(async () => {
    const client = new MoneyloverClient(process.env.ACCESS_TOKEN);

    const inputFile = 'transactions.xls';
    const inputTransactionFile = 'transactions.json';

    extractExcelTransactionsToFile(inputFile, BankParsingConfiguration, inputTransactionFile);
    const transactions = readTransactionsFromFile(inputTransactionFile);

    if (client) {
        process.exit(0);
    }

    const selectedCategory = 'Bills';
    const amount = 42;
    const date = '2023-07-13';

    const wallets = await client.getWallets();
    if (wallets.data.length === 0) {
        throw new Error('Could not find any wallets');
    }

    const [wallet] = wallets.data;
    console.log('Defaulting to first wallet:', wallet.name);
    const requests = mapSubmittableTransactionsToClientRequests(transactions, wallet._id);

    const categories = await client.getCategories({
        walletId: wallet._id,
    });
    console.log(categories);
    const category = categories.data.find((category) => category.name === selectedCategory);
    if (!category) {
        throw new Error(`Cannot resolve category: ${selectedCategory}`);
    }

    console.log('Adding transaction...');
    await client.addTransaction(requests[0]);
    console.log('Done!');
})().catch((err) => {
    console.error(err);
    process.exit(-1);
});
