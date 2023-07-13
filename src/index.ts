import { MoneyloverClient } from './client';

(async () => {
    const client = new MoneyloverClient(process.env.ACCESS_TOKEN);

    const selectedCategory = 'Bills';
    const amount = 42;
    const date = '2023-07-13';

    const wallets = await client.getWallets();
    if (wallets.data.length === 0) {
        throw new Error('Could not find any wallets');
    }

    const [wallet] = wallets.data;
    console.log('Defaulting to first wallet:', wallet.name);

    const categories = await client.getCategories({
        walletId: wallet._id,
    });
    console.log(categories);
    const category = categories.data.find((category) => category.name === selectedCategory);
    if (!category) {
        throw new Error(`Cannot resolve category: ${selectedCategory}`);
    }

    console.log('Adding transaction...');
    await client.addTransaction({
        account: wallet._id,
        category: category._id,
        amount: amount,
        displayDate: date,
    });
    console.log('Done!');
})().catch((err) => {
    console.error(err);
    process.exit(-1);
});
