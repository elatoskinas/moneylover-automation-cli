import axios from 'axios';

export interface AddTransactionRequest {
    category: string;
    account: string;
    amount: number;
    note?: string;
    displayDate: string;
}

export interface GetWalletsResponse {
    data: {
        _id: string;
        name: string;
    }[];
}

export interface GetCategoriesRequest {
    walletId: string;
}

export interface GetCategoriesResponse {
    data: {
        _id: string;
        name: string;
    }[];
}

const MONEYLOVER_BASE_URL = 'https://web.moneylover.me/api';

export class MoneyloverClient {
    private jwtToken: string;

    public constructor(jwtToken: string) {
        this.jwtToken = jwtToken;
    }

    async getWallets(): Promise<GetWalletsResponse> {
        return axios
            .post(`${MONEYLOVER_BASE_URL}/wallet/list`, undefined, this.getAuthorizationConfiguration())
            .then((res) => res.data);
    }

    async getCategories(request: GetCategoriesRequest): Promise<GetCategoriesResponse> {
        return axios
            .post(`${MONEYLOVER_BASE_URL}/category/list`, request, this.getAuthorizationConfiguration())
            .then((res) => res.data);
    }

    async addTransaction(request: AddTransactionRequest): Promise<void> {
        await axios.post(`${MONEYLOVER_BASE_URL}/transaction/add`, request, this.getAuthorizationConfiguration());
    };

    getAuthorizationConfiguration() {
        return {
            headers: {
                Authorization: `AuthJWT ${this.jwtToken}`,
            },
        }
    }
}