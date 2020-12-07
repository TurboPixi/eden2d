import { Application } from "pixi.js";
import { actCreate, Actions, actMove, actTransfer } from "./actions";
import { Chunk, ChunkId } from "./chunk";
import { Entity, EntityId, EntityType, Var } from "./entity";
import { Key } from "./key";
import { Resources } from "./res";
import { World } from "./world";

class Eden {
  private _app: Application;
  private _world: World;
  private _chunk: Chunk;
  private _player: Entity;
  private _invSlot = 0;

  constructor() {
    this._app = new Application({ backgroundColor: 0x1099bb });
    this._app.resizeTo = window;

    document.body.appendChild(this._app.view);
    document.addEventListener('keydown', (evt) => this.keyDown(evt), true);

    Resources.load(() => this.ready());
  }

  private ready() {
    this._world = new World();

    let chunk = this.createChunk();
    this._player = this.createPlayer(chunk);
    this.showChunk(this._player.chunk);

    this._app.stage.interactive = true;
    this._app.ticker.add(() => this.tick())
    this._app.start();
  }

  private createChunk(): Chunk {
    let chunk0 = this._world.toyChunk();
    let chunk1 = this._world.toyChunk();

    portal(this._world, EntityType.StairDown, chunk0.id, 1, 5, chunk1.id, 2, 5);
    portal(this._world, EntityType.StairUp, chunk1.id, 1, 5, chunk0.id, 2, 5);
    return chunk0;
  }

  private createPlayer(chunk: Chunk): Entity {
    let playerId = Actions.eval(this._world, actCreate(EntityId.System, chunk.id, EntityType.Player, 1, 1))
    let player = chunk.entity(playerId);
    chunk.addEntity(player);

    let inv = this._world.newChunk();
    player.setChunk(Var.Contents, inv.id)
    this._app.stage.addChild(inv.container);

    return player;
  }

  private showChunk(chunk: Chunk) {
    if (this._chunk) {
      this._app.stage.removeChild(this._chunk.container);
    }
    this._chunk = chunk;
    this._app.stage.addChild(this._chunk.container);
  }

  private keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      // Move.
      case Key.W: this.move(0, -1); break;
      case Key.S: this.move(0, 1); break;
      case Key.A: this.move(-1, 0); break;
      case Key.D: this.move(1, 0); break;

      // Go.
      case Key.G: this.go(); break;

      // Create.
      case Key.C: this.create(EntityType.ObjectKey); break;

      // Take, put.
      case Key.T: this.take(); break;
      case Key.P: this.put(); break;

      // Selection.
      case Key._0: this.selectInv(9); break;
      case Key._1: case Key._2: case Key._3: case Key._4:
      case Key._5: case Key._6: case Key._7: case Key._8: case Key._9:
        this.selectInv(evt.keyCode - Key._1)
        break;
    }
  }

  private move(dx: number, dy: number) {
    Actions.eval(this._world, actMove(EntityId.System, this._chunk.id, this._player.id, dx, dy));
  }

  private go() {
    let portal = topWithVar(this._chunk, Var.Portal, this._player.x, this._player.y);
    if (portal) {
      let toChunk = portal.getChunk(Var.PortalChunk);
      let toX = portal.getNum(Var.PortalX);
      let toY = portal.getNum(Var.PortalY);
      Actions.eval(this._world, actTransfer(this._player.id, this._chunk.id, this._player.id, toChunk, toX, toY));
    }
  }

  private take() {
    let x = this._player.x;
    let y = this._player.y;
    let target = topWithVar(this._chunk, Var.Portable, x, y);
    if (target != null) {
      let invChunk = this._player.getChunk(Var.Contents);
      Actions.eval(this._world, actTransfer(this._player.id, this._chunk.id, target.id, invChunk, this._invSlot, 0));
    }
  }

  private put() {
    let invChunkId = this._player.getChunk(Var.Contents);
    let invChunk = this._world.chunk(invChunkId);
    let target = topWithVar(invChunk, Var.Portable, this._invSlot, 0);
    if (target != null) {
      let x = this._player.x;
      let y = this._player.y;
      Actions.eval(this._world, actTransfer(this._player.id, invChunkId, target.id, this._chunk.id, x, y));
    }
  }

  private create(type: EntityType) {
    Actions.eval(this._world, actCreate(this._player.id, this._chunk.id, type, this._player.x, this._player.y));
  }

  private selectInv(slot: number) {
    if (slot < 0 || slot > 9) {
      throw "invalid inventory slot";
    }
    this._invSlot = slot;
    // TODO: Something visual.
  }

  private tick() {
    // Follow the player across chunks.
    if (this._player.chunk != this._chunk) {
      this.showChunk(this._player.chunk);
    }

    let w = this._app.view.width;
    let h = this._app.view.height;

    let invId = this._player.getChunk(Var.Contents);
    this._world.chunk(invId).container.setTransform(0, h - 64, 4, 4);

    let x = (this._player.x - 4) * 16;
    let y = (this._player.y - 4) * 16;
    this._chunk.tick(x, y, 4, w, h);
  }
}

function portal(world: World, type: EntityType, fromId: ChunkId, fx: number, fy: number, toId: ChunkId, tx: number, ty: number) {
  let from = world.chunk(fromId);
  let entId = Actions.eval(world, actCreate(EntityId.System, fromId, type, fx, fy));
  let ent = from.entity(entId);
  ent.setChunk(Var.PortalChunk, toId);
  ent.setNum(Var.PortalX, tx);
  ent.setNum(Var.PortalY, ty);
}

function topWithVar(chunk: Chunk, boolVar: Var, x: number, y: number): Entity {
  let ents = chunk.entitiesAt(x, y);
  for (var ent of ents) {
    if (ent.getBool(boolVar)) {
      return ent;
    }
  }
  return null;
}

new Eden();
