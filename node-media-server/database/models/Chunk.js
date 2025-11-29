const {Sequelize, DataTypes, Model} = require('sequelize');
const database = require('../database');
const fs = require('fs');

class Chunk extends Model {
    constructor(values, options){
        super(values, options);
        this.updateStats();
    }

    updateStats() {
        try {
            this.stats = fs.statSync(this.path);
            this.uploaded = this.stats.size;
        } catch (error) {
            this.stats = null;
            this.uploaded = 0;
        }
    }
}

Chunk.init({
    id: {
        type: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    created: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    path: {
        type: DataTypes.STRING,
    },
    totalSize: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
}, {
    sequelize: database,
    modelName: 'Chunk'
});

module.exports = Chunk;