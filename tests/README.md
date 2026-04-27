# KlineGame Frontend Tests

Playwright-based E2E test suite for the 股票大作手 (Stock Trader Master) K-line game.

## Project Structure

```
tests/
├── page-objects/
│   └── KlineGamePage.ts    # Page Object Model
├── api-mocks.ts            # API mocking utilities
├── fixtures.ts             # Playwright fixtures
├── test-utils.ts           # Test utility functions
├── kline-game.spec.ts     # Main test suite
├── game-flow.spec.ts      # Game flow tests
├── responsive.spec.ts     # Responsive design tests
└── README.md              # This file
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run test:install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run with UI (headed mode)
```bash
npm run test:ui
```

### Run specific test suites
```bash
npm run test:game-flow    # Game flow tests
npm run test:responsive   # Responsive design tests
```

### Run on specific viewport
```bash
npm run test:mobile    # Mobile tests
npm run test:tablet    # Tablet tests
npm run test:desktop   # Desktop tests
```

### Debug mode
```bash
npm run test:debug
```

### Generate tests with codegen
```bash
npm run test:codegen
```

### View test report
```bash
npm run test:report
```

## Test Coverage

### Main Test Suite (`kline-game.spec.ts`)
- Page navigation & initial load
- Loading state (animation, cycling tips)
- Playing state (canvas, buttons, score)
- Guess interactions
- Complete game flow
- Finished state (results, stock info)
- Share functionality
- Error state & retry
- Responsive design (mobile/tablet/desktop)
- Canvas rendering
- Accessibility
- Performance
- Visual styling

### Game Flow Tests (`game-flow.spec.ts`)
- Complete game flows (all up, all down, alternating)
- API retry logic
- Loading delays
- Different stock data
- Score calculation
- Button states
- Canvas rendering

### Responsive Tests (`responsive.spec.ts`)
- Viewport rendering at all sizes
- Button layout adaptation
- Font size adaptation
- Canvas size adaptation
- Dynamic resize handling
- Touch optimization
- Spacing adaptation
- Breakpoint detection

## Key Features Tested

1. **Loading State**
   - Loading animation display
   - Cycling loading tips (every 2 seconds)
   - Font preloading

2. **Game Playing State**
   - Question counter (1/5 to 5/5)
   - K-line canvas chart rendering
   - Up/Down guess buttons
   - Score tracking
   - Win rate calculation

3. **Guess Mechanics**
   - Click handling
   - Answer reveal
   - Score updates
   - State transitions

4. **Game Completion**
   - Final score display
   - Stock information (code + name)
   - Date range
   - Congratulations message (based on score)
   - Play again button
   - Share button

5. **Error Handling**
   - API failure display
   - Retry functionality
   - Automatic retry (3 attempts)

6. **Responsive Design**
   - Mobile (<768px)
   - Tablet (768px - 1024px)
   - Desktop (>1024px)
   - Dynamic resize handling

## API Mocking

The test suite uses Playwright's `page.route()` to mock API responses:

- `mockWithStockData()` - Mock with specific stock
- `mockAPIFailure()` - Force API failure
- `mockFailThenSucceed()` - Test retry logic
- `mockWithDelay()` - Test loading states
- `mockRandomStocks()` - Random stock selection

## Page Object Model

The `KlineGamePage` class provides:
- Element locators for all UI components
- State detection methods
- Action methods (guess, share, retry)
- Verification methods
- Responsive helpers

Example:
```typescript
const klinePage = new KlineGamePage(page);
await klinePage.goto();
await klinePage.waitForLoadingToFinish();
await klinePage.waitForGameState('playing');
await klinePage.makeGuess('up');
```
