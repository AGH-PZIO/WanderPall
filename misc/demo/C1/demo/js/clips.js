(function () {
  "use strict";

  /**
   * Klipy w tle — wzorzec URL z assets/clips/url.txt:
   * https://www.pexels.com/download/video/{ID}/?fps=...&h=360&w=640 (jakość SD)
   * Przy błędzie sieci fallback na lokalne pliki z assets/clips/.
   */
  window.WP_CLIPS = [
    {
      id: "5790198",
      web: "https://www.pexels.com/download/video/5790198/?fps=29.97&h=360&w=640",
      local: "clips/5790198-sd_640_360_30fps.mp4",
    },
    {
      id: "14372814",
      web: "https://www.pexels.com/download/video/14372814/?fps=29.97&h=360&w=640",
      local: "clips/14372814_1280_720_30fps.mp4",
    },
    {
      id: "7009786",
      web: "https://www.pexels.com/download/video/7009786/?fps=25&h=360&w=640",
      local: "clips/7009786-hd_1280_720_25fps.mp4",
    },
    {
      id: "8774842",
      web: "https://www.pexels.com/download/video/8774842/?fps=25&h=360&w=640",
      local: "clips/8774842-hd_1280_720_25fps.mp4",
    },
  ];
})();
