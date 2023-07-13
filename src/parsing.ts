import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { SubmittableTransactionEntry } from './data';

export interface ExcelParsingConfiguration {
    parseDate: (row: unknown) => string;
    parseAmount: (row: unknown) => number;
    parseDescription: (row: unknown) => string | undefined;
    parseCategory?: (row: unknown) => string | undefined;
}

export const BankParsingConfiguration: ExcelParsingConfiguration = {
    parseDate: (row) => {
        const dateString = row['valuedate'].toString();
        const year = dateString.slice(0, 4);
        const month = dateString.slice(4, 6);
        const day = dateString.slice(6, 8);
        return `${year}-${month}-${day}`;
    },
    parseAmount: (row: unknown) => {
        return Number.parseInt(row['amount']);
    },
    parseDescription: (row: unknown) => {
        return row['description'];
    },
}

export const extractExcelTransactions = (filepath: string, parsingConfiguration: ExcelParsingConfiguration): SubmittableTransactionEntry[] => {
    const { parseDate, parseAmount, parseDescription, parseCategory } = parsingConfiguration;

    const workbook = XLSX.readFile(filepath);
    
    if (workbook.SheetNames.length === 0) {
        throw new Error(`Empty Excel Sheet specified in path: ${filepath}`);
    }
    const [sheetName] = workbook.SheetNames;
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log(rows);

    return rows.map((row) => {
        return {
            amount: parseAmount(row),
            description: parseDescription(row),
            date: parseDate(row),
            category: parseCategory?.(row) ?? 'UNKNOWN',
        }
    });
}
