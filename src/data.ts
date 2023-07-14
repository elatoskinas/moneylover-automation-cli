export interface SubmittableTransactionEntry {
  amount: number;
  description?: string;
  /** YYYY-MM-DD format */
  date: string;
  category: string;
  isProcessed?: boolean;
}
