import { SceneManager } from "./core/SceneManager.js";
import { MenuScene } from "./scenes/MenuScene.js";

const root = document.querySelector("#app");
const manager = new SceneManager(root);

manager.load(MenuScene);
