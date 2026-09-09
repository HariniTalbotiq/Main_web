# Article cover artwork

Drop the branded editorial covers here, named by **node id**, as `.jpg`:

    815608.jpg   The tokenmaxxing trap: Why cheaper AI is blowing up enterprise budgets
    805615.jpg   From guesswork to ground truth: The deep tech revolution in modern agriculture
    771029.jpg   Beyond the human hand: The rise of AI in surgery
    763415.jpg   The AI advantage: Twin turbo for profit and purpose
    756655.jpg   AI's impact on jobs: Evolution not extinction
    754007.jpg   AI-driven digital strategies can transform SMEs
    750445.jpg   The algorithmic edge: How AI is reshaping the business landscape
    743770.jpg   The global AI race: The new Cold War

`build.js` looks for each file at build time. A file that is here is used; a
file that is not falls back to the photograph The Edge puts on the article
page, so the grid is never broken by a missing cover.

Nothing else to change — drop the files in and run `node build.js`.

The covers are 16:9 and the card forces that ratio, so anything squarer will be
cropped top and bottom. Around 1200px wide is plenty; the card renders at 336px
on a 1440px screen.

These are NOT on theedgemalaysia.com. The article pages and the author index
both carry a stock photograph instead, which is what `articles.js` records in
`img` and what the cards fall back to today.
