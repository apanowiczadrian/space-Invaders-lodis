export class WeaponHeatSystem {
    constructor() {
        this.maxHeat = 100;
        this.currentHeat = 0;
        this.heatPerShot = 5; // Heat added per shot
        this.coolingRate = 20; // Heat removed per second
        this.overheated = false;
        this.cooldownThreshold = 50; // Must cool to this level to unblock
    }

    canFire() {
        return !this.overheated;
    }

    addHeat() {
        if (this.overheated) return false;

        this.currentHeat += this.heatPerShot;

        if (this.currentHeat >= this.maxHeat) {
            this.currentHeat = this.maxHeat;
            this.overheated = true;
            return false;
        }

        return true;
    }

    update(dt) {
        // Cool down over time
        if (this.currentHeat > 0) {
            this.currentHeat -= this.coolingRate * dt;
            if (this.currentHeat < 0) {
                this.currentHeat = 0;
            }
        }

        // Check if cooled down enough to unblock
        if (this.overheated && this.currentHeat <= this.cooldownThreshold) {
            this.overheated = false;
        }
    }

    getHeatPercentage() {
        return this.currentHeat / this.maxHeat;
    }

    isOverheated() {
        return this.overheated;
    }

    reset() {
        this.currentHeat = 0;
        this.overheated = false;
    }
}
