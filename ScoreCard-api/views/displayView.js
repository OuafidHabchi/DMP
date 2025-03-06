class DisplayView {
    static render(data) {
      data.forEach((item) => {
        console.log(JSON.stringify(item, null, 2)); // Affiche chaque ligne de manière lisible
      });
    }
  }
  
  module.exports = DisplayView;
  