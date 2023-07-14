import { MoneyloverClient } from './client';
import { dumpCategories, parseExcel, postTransactions, labelCategories, rollupTransactions } from './commands';
import cli from 'command-line-args';
import { BankParsingConfiguration, WiseParsingConfiguration } from './parsing';

const client = new MoneyloverClient(process.env.ACCESS_TOKEN);

const commandDefinitions: cli.OptionDefinition[] = [
    { name: 'command', defaultOption: true },
];

const dumpCategoriesDefinitions: cli.OptionDefinition[] = [
    { name: 'outputPath', defaultOption: true },
];

const parseExcelDefinitions: cli.OptionDefinition[] = [
    { name: 'paths', defaultOption: true, multiple: true },
];

const postTransactionsDefinitions: cli.OptionDefinition[] = [
    { name: 'inputPath', defaultOption: true },
];

const labelCategoriesDefinitions: cli.OptionDefinition[] = [
    { name: 'inputPath', defaultOption: true },
];

const rollupTransactionsDefinitions: cli.OptionDefinition[] = [
    { name: 'inputPath', defaultOption: true },
];

const mainOptions = cli(commandDefinitions, { stopAtFirstUnknown: true })

const argv = mainOptions._unknown || []
const { command } = mainOptions;

if (command === 'dump-categories') {
    const dumpCategoriesOptions = cli(dumpCategoriesDefinitions, { argv });
    const dumpCategoriesRequest = {
        outputPath: dumpCategoriesOptions.outputPath,
    };

    dumpCategories(client, dumpCategoriesRequest);
} else if (command === 'parse-excel') {
    const parseExcelOptions = cli(parseExcelDefinitions, { argv });
    console.log(parseExcelOptions);
    const { paths } = parseExcelOptions;

    if (paths.length < 2) {
        throw new Error(`Two positional args are expected: parse-excel <input-path> <output-path>`);
    }

    // TODO: parser should come as an option : --parser <parser>
    const [inputPath, outputPath, parser] = paths;
    const parseExcelRequest = {
        inputPath,
        outputPath,
    };

    const parsingConfiguration = parser === 'wise' ? WiseParsingConfiguration : BankParsingConfiguration;
    parseExcel(parseExcelRequest, parsingConfiguration);
} else if (command === 'post-transactions') {
    const postTransactionsOptions = cli(postTransactionsDefinitions, { argv });
    const postTransactionsRequest = {
        inputPath: postTransactionsOptions.inputPath,
    };

    postTransactions(client, postTransactionsRequest);
} else if (command === 'label-categories') {
    const labelCategoriesOptions = cli(labelCategoriesDefinitions, { argv });
    const labelCategoriesRequest = {
        inputPath: labelCategoriesOptions.inputPath,
    };

    labelCategories(client, labelCategoriesRequest);
} else if (command === 'rollup-transactions') {
    const rollupTransactionsOptions = cli(rollupTransactionsDefinitions, { argv });
    const rollupTransactionsRequest = {
        inputPath: rollupTransactionsOptions.inputPath,
    };

    rollupTransactions(rollupTransactionsRequest);
} else {
    throw new Error(`Unrecognized command: ${command}`);
}
