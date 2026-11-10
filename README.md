# Coupon Finder Pro Chrome Extension

A legitimate and privacy-focused Chrome extension that helps you find and validate coupon codes while shopping online.

## Features

- Automatically scans web pages for valid coupon codes
- Tests coupons to verify their validity
- Clean, user-friendly interface
- Privacy-focused: No data collection or tracking
- Real-time coupon validation
- Smart success rate calculation
- Automatic detection of shopping sites

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. The extension icon will automatically activate on shopping sites
2. Click the extension icon to see available coupons
3. Click on any coupon to copy it to your clipboard
4. Use the settings toggle to enable/disable auto-scanning and notifications

## Privacy & Security

- No personal data is collected or stored
- All coupon validation is done locally
- No external API calls or tracking
- Open source and transparent code

## Development

The extension is built using vanilla JavaScript and Chrome Extension APIs. To modify:

1. Edit the relevant files:
   - `manifest.json`: Extension configuration
   - `popup.html/js`: UI and interaction
   - `content.js`: Page scanning and coupon detection
   - `background.js`: Background processes

2. Reload the extension in Chrome to test changes

## Contributing

Feel free to submit issues and pull requests to improve the extension.

## License

MIT License - feel free to use and modify as needed.
