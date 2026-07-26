const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

const dir = path.join(__dirname, '..', '..', 'quoteImages');
const weightsFilePath = path.join(__dirname, '..', '..', 'quoteWeights.json');

function loadWeights() {
    if (fs.existsSync(weightsFilePath)) {
        try {
            return JSON.parse(fs.readFileSync(weightsFilePath, 'utf8'));
        } catch (e) {
            console.error(e);
        }
    }
    return {};
}

function saveWeights(weights) {
    fs.writeFileSync(weightsFilePath, JSON.stringify(weights, null, 2), 'utf8');
}

module.exports = {
    name: 'randomquote',
    description: '隨機選擇成員語錄',

    callback: async (client, interaction) => {
        try {
            const files = fs.readdirSync(dir).filter(file => !file.startsWith('.'));
            const totalFiles = files.length;

            const BASE_WEIGHT = 1;

            const UNSEEN_WEIGHT = Math.max(5, Math.floor(totalFiles * 0.5));

            const weights = loadWeights();
            files.forEach(file => {
                if (!(file in weights)) {
                    weights[file] = UNSEEN_WEIGHT;
                }
            });

            const totalWeight = files.reduce((sum, file) => sum + (weights[file] ?? UNSEEN_WEIGHT), 0);
            let randomNum = Math.random() * totalWeight;
            let selectedFile = files[0];

            for (const file of files) {
                const weight = weights[file] ?? UNSEEN_WEIGHT;
                if (randomNum < weight) {
                    selectedFile = file;
                    break;
                }
                randomNum -= weight;
            }

            weights[selectedFile] = BASE_WEIGHT;

            saveWeights(weights);

            const imagePath = path.join(dir, selectedFile);
            await interaction.reply({ files: [new AttachmentBuilder(imagePath)] });

        } catch (error) {
            console.error(error);
        }
    },
};