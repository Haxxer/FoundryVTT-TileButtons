import flagManager from "./flag-manager.js";
import * as lib from "./lib/lib.js";

const InteractionHandler = {

    mouseOverAllTiles: new Set(),
    mouseOverTiles: new Set(),
    pressedTiles: new Set(),
    managedTiles: new Set(),
    mouse: false,
    active: true,

    ready(){
        this.mouse = canvas?.app?.renderer?.plugins?.interaction?.mouse;
        this.enableEvents();
    },

    canvasReady(){
        this.mouseOverAllTiles = new Set()
        this.mouseOverTiles = new Set()
        this.pressedTiles = new Set()
        this.managedTiles = new Set()
        this.preloadTiles();
    },

    enableEvents(){
        let _this = this;
        Hooks.on("lightingRefresh", function(){
            _this.active = canvas.activeLayer === canvas.tokens;
        })
        document.body.addEventListener('mousemove', this.mouseMoveEvent.bind(this));
        document.body.addEventListener('mousedown', this.mouseDownEvent.bind(this));
        document.body.addEventListener('mouseup', this.mouseUpEvent.bind(this));
    },

    preloadTiles(){
        canvas.scene.tiles.filter(tile => flagManager.getFlags(tile))
            .forEach(tile => this.addManagedTile(tile));
    },

    addManagedTile(tile){
        lib.debug("Added managed tile:", tile.id);
        this.managedTiles.add(new ManagedTile(tile));
    },

    removeManagedTile(tile){
        const managedTile = Array.from(this.managedTiles).find(managedTile => managedTile.tile === tile);
        if(!managedTile) return;
        lib.debug("Removed managed tile:", tile.id);
        this.managedTiles.delete(managedTile);
    },

    get currentMousePosition(){
        return this.mouse.getLocalPosition(canvas.app.stage);
    },

    mouseMoveEvent() {

        if(!this.active) return;

        for (let managedTile of this.managedTiles) {
            const mouseOver = managedTile.contains(this.currentMousePosition) && !this.mouseOverAllTiles.has(managedTile);
            const mouseOut = !managedTile.contains(this.currentMousePosition) && this.mouseOverAllTiles.has(managedTile);

            if(mouseOver){
                this.mouseOverAllTiles.add(managedTile);
            }

            if(mouseOut){
                this.mouseOverAllTiles.delete(managedTile);
                this.handleTileMouseOut(managedTile);
            }
        }

        const sortedTiles = Array.from(this.mouseOverAllTiles)
        sortedTiles.sort((a, b) => {
            return b.tile.data.z - a.tile.data.z;
        });
        this.mouseOverAllTiles = new Set(sortedTiles);

        let mouseOverResult = true;
        for(let managedTile of this.mouseOverAllTiles){
            if(!mouseOverResult){
                this.handleTileMouseOut(managedTile);
                continue;
            }
            mouseOverResult = this.handleTileMouseOver(managedTile);
        }

    },

    async mouseDownEvent(){

        if(!this.active) return;

        for(let managedTile of this.mouseOverTiles){
            const pressResult = await this.handlePressedTile(managedTile);
            if(!pressResult){
                break;
            }
        }

    },

    handleTileMouseOver(managedTile){
        this.mouseOverTiles.add(managedTile);
        return managedTile.mouseOverEvent();
    },

    handleTileMouseOut(managedTile){
        this.mouseOverTiles.delete(managedTile);
        this.handleReleasedTile(managedTile);
        managedTile.mouseOutEvent();
    },

    async mouseUpEvent(){

        if(!this.active) return;

        for(let managedTile of this.pressedTiles){
            const releasedResult = this.handleReleasedTile(managedTile);
            if(!releasedResult){
                break;
            }
        }
    },

    async handlePressedTile(managedTile){
        this.pressedTiles.add(managedTile);
        return managedTile.pressedEvent();
    },

    handleReleasedTile(managedTile){
        if(!this.pressedTiles.has(managedTile)) return;
        this.pressedTiles.delete(managedTile);
        if(this.mouseOverTiles.has(managedTile)) {
            return managedTile.releasedEvent();
        }
        return true;
    }

}

class ManagedTile{

    constructor(tile) {
        this.id = tile.id;
        this.tile = tile;
        this.placeable = tile._object;
        this.flag = flagManager.getFlags(tile);
        this.data = this.flag.data;
        this.states = {
            ...this.data.states,
            default: {
                img: this.placeable.data.img
            }
        };
        this.currentState = {
            hovered: false,
            pressed: false
        }
        this.preloadImages();
    }

    async preloadImages(){
        Object.values(this.states).forEach(state => loadTexture(state.img));
    }

    setImage(image){
        if(!image) image = this.states.default.img;
        this.placeable.data.img = image;
        this.placeable.draw();
    }

    mouseOverEvent(){
        if(!this.states.hover){
            return true;
        }

        const hoverPassthrough = this.states.hover?.passthrough ?? true;
        if(this.currentState.hovered) return hoverPassthrough;

        lib.debug("Tile mouse over", this.id);

        this.currentState.hovered = true;
        this.setImage(this.states.hover.img);

        return hoverPassthrough;
    }

    mouseOutEvent(){
        if(!this.currentState.hovered) return;
        this.currentState.hovered = false;
        lib.debug("Tile mouse out", this.id);
        this.reset();
    }

    pressedEvent(){
        if(!this.states.pressed){
            return true;
        }
        lib.debug("Tile pressed", this.id);
        this.currentState.pressed = true;
        this.setImage(this.states.pressed.img);
        return this.data.pressed?.passthrough ?? true;
    }

    releasedEvent(){
        if(!this.states.released){
            return this.reset();
        }
        lib.debug("Tile released", this.id);
        this.currentState.pressed = false;
        this.setImage(this.states.released.img);
        return this.states.released?.passthrough ?? true;
    }

    reset(){
        if(this.currentState.hovered){
            this.setImage(this.states.hover.img);
        }else{
            this.setImage(this.states.default.img);
        }
    }

    contains(position){
        return position.x >= this.tile.data.x
            && position.y >= this.tile.data.y
            && position.x <= (this.tile.data.x + this.tile.data.width)
            && position.y <= (this.tile.data.y + this.tile.data.height);
    }

}

export default InteractionHandler;