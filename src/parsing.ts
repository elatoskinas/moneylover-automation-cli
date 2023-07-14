import * as XLSX from "xlsx";
import * as fs from "fs";
import { SubmittableTransactionEntry } from "./data";

export interface ExcelParsingConfiguration {
  /** Parses the date from a row into a YYYY-MM-DD date */
  parseDate: (row: unknown) => string;
  /** Parses the transaction amount from a row into a numeric amount */
  parseAmount: (row: unknown) => number;
  /** Parses the description from a row, if available */
  parseDescription: (row: unknown) => string | undefined;
  /** Parses the category from a row, if available */
  parseCategory?: (row: unknown) => string | undefined;
}

export const BankParsingConfiguration: ExcelParsingConfiguration = {
  parseDate: (row) => {
    const dateString = row["valuedate"].toString();
    const year = dateString.slice(0, 4);
    const month = dateString.slice(4, 6);
    const day = dateString.slice(6, 8);
    return `${year}-${month}-${day}`;
  },
  parseAmount: (row: unknown) => {
    return Number.parseFloat(row["amount"]);
  },
  parseDescription: (row: unknown) => {
    return row["description"];
  },
};

export const WiseParsingConfiguration: ExcelParsingConfiguration = {
  parseDate: (row) => {
    const [day, month, year] = row["Date"].toString().split("-");
    return `${year}-${month}-${day}`;
  },
  parseAmount: (row: unknown) => {
    return Number.parseFloat(row["Amount"]);
  },
  parseDescription: (row: unknown) => {
    return row["Description"];
  },
};

/**
 * Parses an Excel and returns the parsed transactions using the target configuration
 */
export const extractExcelTransactions = (
  filepath: string,
  parsingConfiguration: ExcelParsingConfiguration,
): SubmittableTransactionEntry[] => {
  const { parseDate, parseAmount, parseDescription, parseCategory } =
    parsingConfiguration;

  const workbook = XLSX.readFile(filepath, { raw: true });

  if (workbook.SheetNames.length === 0) {
    throw new Error(`Empty Excel Sheet specified in path: ${filepath}`);
  }
  const [sheetName] = workbook.SheetNames;
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  return rows.map((row) => {
    return {
      amount: parseAmount(row),
      description: parseDescription(row),
      date: parseDate(row),
      category: parseCategory?.(row) ?? "UNKNOWN",
    };
  });
};

/**
 * Parses an Excel and saves the submittable transactions to the output file
 */
export const extractExcelTransactionsToFile = (
  filepath: string,
  parsingConfiguration: ExcelParsingConfiguration,
  outputFilePath: string,
): void => {
  const transactions = extractExcelTransactions(filepath, parsingConfiguration);
  const stringifiedTransactions = JSON.stringify(transactions, undefined, 4);
  fs.writeFileSync(outputFilePath, stringifiedTransactions);
};

/**
 * Reads submittable transactions from a file
 */
export const readTransactionsFromFile = (
  filepath: string,
): SubmittableTransactionEntry[] => {
  // TODO: replace JSON.parse with zod
  return JSON.parse(fs.readFileSync(filepath).toString());
};
