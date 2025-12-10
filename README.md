# Toronto Drop-In Activities Schedule

A web application for browsing drop-in sports and recreational activities across Toronto, built with React and powered by [Toronto Open Data](https://open.toronto.ca).

🚧 **Beta Version** - This project is under active development. Feedback, bug reports, and contributions are welcome!

## Features

- **Daily Updated Data**: Automatically refreshes daily at 9 AM EST with the latest activities from Toronto Open Data
- **Flexible Filtering**: Filter by sport type, day of week, location, time of day, and date range
- **Search Functionality**: Search across sports, locations, and addresses
- **Responsive Design**: Works on desktop and mobile devices
- **Fast Performance**: Uses an embedded SQLite database for instant client-side filtering

## Live Demo

Visit the live application: [https://jentacularjava.github.io/Toronto_Drop_In/](https://jentacularjava.github.io/Toronto_Drop_In/)

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Database**: SQL.js (SQLite compiled to WebAssembly)
- **Data Source**: Toronto Open Data Portal
- **Deployment**: GitHub Pages with GitHub Actions

## Local Development

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jentacularJava/Toronto_Drop_In.git
cd Toronto_Drop_In
```

2. Install dependencies:
```bash
npm install
```

3. Build the database:
```bash
node scripts/build-database.js
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

This will:
1. Build the database from the latest Toronto Open Data CSVs
2. Compile the React application
3. Output to the `dist/` directory

## Data Source

This application uses data from the City of Toronto's Open Data Portal:
- [Drop-In Programs Dataset](https://open.toronto.ca/dataset/drop-in-programs/)

The data includes drop-in sports and recreational activities at City of Toronto facilities, updated daily.

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue describing the bug and how to reproduce it
2. **Suggest Features**: Open an issue with your feature idea
3. **Submit Pull Requests**: Fork the repository, make your changes, and submit a PR

### Development Guidelines

- Follow the existing code style
- Test your changes locally before submitting
- Update documentation as needed
- Keep commits focused and write clear commit messages

## Roadmap

See the [Issues](https://github.com/jentacularJava/Toronto_Drop_In/issues) page for planned features and known bugs.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Data provided by the [City of Toronto Open Data Portal](https://open.toronto.ca)
- Built with [React](https://react.dev/), [Vite](https://vite.dev/), and [SQL.js](https://sql.js.org/)

## Support

If you find this project useful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting improvements
- 🤝 Contributing code

---

**Note**: This is an unofficial project and is not affiliated with the City of Toronto.