function stopGame() {

  isPlaying = false;

  clearInterval(gameInterval);
  clearInterval(timerInterval);

  cells.forEach(cell => {
    cell.classList.remove("target");
  });

}