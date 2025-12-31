# NYA3NEKO2 GAMES

A collection of casual games by Nya3Neko2, featuring the "Kagamimochi Stacker".

## Project Structure

This project is a Multi-Page Application configured with Vite.

- **Root (`/`)**: Game Portal (Neo-Brutalism Design)
- **`/mochi-stack/`**: Kagamimochi Stacker Game

## Development

### Setup

```bash
npm install
```

### Run Locally

```bash
npm run dev
```
Access the portal at `http://localhost:5173/` and the game at `http://localhost:5173/mochi-stack/`.

### Build

```bash
npm run build
```
Output will be in the `dist` directory.

## Deployment

Hosted on Cloudflare Pages.

- **Project Name**: `kagamimochi-game`
- **Production URL**: https://kagamimochi-game.pages.dev/
- **Custom Domain**: https://game.nya3neko2.dev/ (Requires configuration in Cloudflare Dashboard)

### Deploy Command

```bash
npx wrangler pages deploy dist --project-name kagamimochi-game
```

## Games

### 🍊 Kagamimochi Stacker
Stack the Mochi infinitely! A physics-based New Year celebration chaos game.
- Powered by `matter-js`

## Author
**Nya3Neko2**
- [Portfolio](https://nya3neko2.dev)
- [Twitter](https://twitter.com/nya3_neko2)
- [GitHub](https://github.com/nyanko3141592)
