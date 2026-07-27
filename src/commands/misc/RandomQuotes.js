const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

const dir = path.join(__dirname, '..', '..', 'quoteImages');

const memoryWeights = new Map();

module.exports = {
    name: 'randomquote',
    description: '隨機選擇成員語錄',

    callback: async (client, interaction) => {
        await interaction.deferReply();

        try {
            const files = fs.readdirSync(dir).filter(file => !file.startsWith('.'));
            const totalFiles = files.length;
            const BASE_WEIGHT = 1;
            const UNSEEN_WEIGHT = Math.max(5, Math.floor(totalFiles * 0.5));

            const currentFileSet = new Set(files);
            
            for (const key of memoryWeights.keys()) {
                if (!currentFileSet.has(key)) {
                    memoryWeights.delete(key);
                }
            }

            files.forEach(file => {
                if (!memoryWeights.has(file)) {
                    memoryWeights.set(file, UNSEEN_WEIGHT);
                }
            });

            let totalWeight = 0;
            files.forEach(file => {
                totalWeight += memoryWeights.get(file);
            });

            let randomNum = Math.random() * totalWeight;
            let selectedFile = files[0];

            for (const file of files) {
                const weight = memoryWeights.get(file);
                if (randomNum < weight) {
                    selectedFile = file;
                    break;
                }
                randomNum -= weight;
            }

            files.forEach(file => {
                if (file === selectedFile) {
                    memoryWeights.set(file, BASE_WEIGHT);
                } else {
                    memoryWeights.set(file, memoryWeights.get(file) + 1);
                }
            });

            const imagePath = path.join(dir, selectedFile);
            const attachment = new AttachmentBuilder(imagePath);
            
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(error);
        }
    },
};