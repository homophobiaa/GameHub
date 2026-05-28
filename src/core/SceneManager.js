export class SceneManager {
  constructor(root) {
    this.root = root;
    this.scene = null;
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  load(SceneClass, props = {}) {
    if (this.scene?.destroy) {
      this.scene.destroy();
    }

    this.root.textContent = "";
    this.scene = new SceneClass({
      manager: this,
      props,
    });
    this.scene.mount(this.root);
    this.lastTime = performance.now();
  }

  loop(time) {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;

    if (this.scene?.update) {
      this.scene.update(dt, time / 1000);
    }

    if (this.scene?.render) {
      this.scene.render();
    }

    requestAnimationFrame(this.loop);
  }
}
