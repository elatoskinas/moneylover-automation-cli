import {
  AddTransactionRequest,
  GetCategoriesResponse,
  MoneyloverClient,
} from "./client";
import * as fs from "fs";
import {
  BankParsingConfiguration,
  ExcelParsingConfiguration,
  extractExcelTransactionsToFile,
  readTransactionsFromFile,
} from "./parsing";
import { SubmittableTransactionEntry } from "./data";
import { prompt } from "enquirer";

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

export interface LabelTransactionCategoriesRequest {
  inputPath: string;
}

export interface RollupTransactionsRequest {
  inputPath: string;
}

const getCategoryNamesPerWallet = async (
  client: MoneyloverClient,
  walletName?: string,
): Promise<string[]> => {
  const wallets = await client.getWallets();
  const wallet = walletName
    ? wallets.data.find((wallet) => wallet.name === walletName)
    : wallets.data[0];

  if (!wallet) {
    throw new Error(
      walletName
        ? `Could not find wallet with name: ${walletName}`
        : "Could not find any wallets",
    );
  }

  const categories = await client.getCategories({
    walletId: wallet._id,
  });

  return categories.data.map((category) => category.name);
};

/**
 * Dumps the user's wallet categories to an output file
 */
export const dumpCategories = async (
  client: MoneyloverClient,
  request: DumpCategoriesRequest,
): Promise<void> => {
  const { outputPath } = request;

  const categoryNames = (await getCategoryNamesPerWallet(client)).join("\n");
  console.log(categoryNames);

  fs.writeFileSync(outputPath, categoryNames);
};

/**
 * Parses & saves an Excel into a submittable transactions file
 */
export const parseExcel = async (
  request: ParseExcelRequest,
  parsingConfiguration: ExcelParsingConfiguration = BankParsingConfiguration,
) => {
  const { inputPath, outputPath } = request;
  extractExcelTransactionsToFile(inputPath, parsingConfiguration, outputPath);
};

const mapSubmittableTransactionsToClientRequests = (
  transactions: SubmittableTransactionEntry[],
  targetAccount: string,
  categories: GetCategoriesResponse["data"],
): AddTransactionRequest[] => {
  return transactions.map((transaction) => {
    const resolvedCategory = categories.find(
      (category) => category.name === transaction.category,
    );
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

const writeProcessedTransaction = (
  transactions: SubmittableTransactionEntry[],
  processedTransactionIndex: number,
  inputPath: string,
): void => {
  transactions[processedTransactionIndex] = {
    ...transactions[processedTransactionIndex],
    isProcessed: true,
  };
  fs.writeFileSync(inputPath, JSON.stringify(transactions, undefined, 4));
};

/**
 * Submits transactions from a submittable transacations file to
 * the MoneyLover user's wallet
 */
export const postTransactions = async (
  client: MoneyloverClient,
  request: PostTransactionsRequest,
) => {
  const { inputPath } = request;
  const transactions = readTransactionsFromFile(inputPath).filter(
    (transaction) => {
      return !transaction.isProcessed;
    },
  );

  const wallets = await client.getWallets();
  if (wallets.data.length === 0) {
    throw new Error("Could not find any wallets");
  }

  const [wallet] = wallets.data;
  console.log("Defaulting to first wallet:", wallet.name);

  const categories = await client.getCategories({
    walletId: wallet._id,
  });

  const requests = mapSubmittableTransactionsToClientRequests(
    transactions,
    wallet._id,
    categories.data,
  );
  console.log("Total transactions to process:", requests.length);

  for (let i = 0; i < requests.length; ++i) {
    console.log(`Adding transaction... (${i + 1}/${requests.length})`);
    await client.addTransaction(requests[i]);
    writeProcessedTransaction(transactions, i, inputPath);
  }
};

/**
 * Prompts the user to input categories for transactions which have unknown fields
 */
export const labelCategories = async (
  client: MoneyloverClient,
  request: LabelTransactionCategoriesRequest,
) => {
  const { inputPath } = request;
  const transactions = readTransactionsFromFile(inputPath);

  const categoryNames = await getCategoryNamesPerWallet(client);

  for (const transaction of transactions) {
    if (transaction.category !== "UNKNOWN") {
      continue;
    }

    console.log(transaction);
    const selectedOption = await prompt<
      Pick<SubmittableTransactionEntry, "category">
    >({
      type: "autocomplete",
      name: "category",
      message: "Select a category for the above transaction",
      choices: categoryNames,
    });
    transaction.category = selectedOption.category;
    fs.writeFileSync(inputPath, JSON.stringify(transactions, undefined, 4));
  }
};

export const rollupTransactions = (request: RollupTransactionsRequest) => {
  const { inputPath } = request;
  const transactions = readTransactionsFromFile(inputPath);
  console.log("Pre-rollup transactions:", transactions.length);

  // Map: date -> category -> aggregate transaction
  const transactionMap: Record<
    string,
    Record<string, SubmittableTransactionEntry & { index: number }>
  > = {};
  const processedTransactions: (SubmittableTransactionEntry & {
    index: number;
  })[] = [];

  transactions.forEach((transaction, index) => {
    const transactionWithIndex = { ...transaction, index };

    if (transaction.isProcessed) {
      processedTransactions.push(transactionWithIndex);
      return;
    }

    if (!transactionMap[transaction.date]) {
      transactionMap[transaction.date] = {
        [transaction.category]: transactionWithIndex,
      };
    } else if (!transactionMap[transaction.date][transaction.category]) {
      transactionMap[transaction.date][transaction.category] =
        transactionWithIndex;
    } else {
      const currentTransaction =
        transactionMap[transaction.date][transaction.category];
      currentTransaction.amount += transaction.amount;
      currentTransaction.index = Math.max(currentTransaction.index, index);
    }
  });

  const flatTransactions = Object.entries(transactionMap).flatMap(
    ([, mapEntries]) => {
      return Object.values(mapEntries);
    },
  );
  const newTransactions = [...processedTransactions, ...flatTransactions]
    .sort((a, b) => a.index - b.index)
    .map((transaction) => {
      const { index, ...transactionWIthoutIndex } = transaction;
      return transactionWIthoutIndex;
    });
  console.log("Post-rollup transactions:", newTransactions.length);

  fs.writeFileSync(inputPath, JSON.stringify(newTransactions, undefined, 4));
};
