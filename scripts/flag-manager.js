import CONSTANTS from "./constants.js";

const flagManager = {

    _latestFlagVersion: false,

    getFlags: (inObject) => {
        let data = inObject.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME);
        return flagManager.runMigrations(data);
    },

    runMigrations(data){

        if(!data) return false;

        for (let [version, migration] of Object.entries(flagManager.migrations)) {
            version = Number(version);
            if (data.flagVersion >= version) continue;
            data = migration(data);
        }

        if (data.flagVersion < this.latestFlagVersion && game.user.isGM){
            data.flagVersion = this.latestFlagVersion;
            inObject.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME, data);
        }

        return data;

    },

    migrations: {

        "1.0": (data) => {
            // Base version, nothing happens here
            return data;
        },

    },

    get latestFlagVersion() {
        if (!flagManager._latestFlagVersion) {
            const versions = Object.keys(this.migrations).map(version => Number(version));
            versions.sort();
            flagManager._latestFlagVersion = versions.pop();
        }
        return flagManager._latestFlagVersion;
    }

}

export default flagManager;