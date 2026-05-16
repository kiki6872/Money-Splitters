# NexusSplit - Split Bills Instantly

A web-based bill splitting app that stores all data as JSON. Works both as a standalone client-side app (using localStorage) and as a full-stack app with a Node.js backend (using JSON files).

## Quick Start (No Server Required)

Simply open `public/index.html` in any browser. All data is stored in your browser's localStorage as JSON.

```
# Just double-click public/index.html or use a simple HTTP server:
# Python:
python -m http.server 3000 --directory public

# Or use VS Code Live Server extension
```

## Full-Stack Mode (with Node.js)

If you have Node.js installed, you can run the Express server which stores data in JSON files on disk:

```bash
npm install
npm start
```

Then open http://localhost:3000

## Data Storage

### Client-Side (localStorage)
All data is stored as JSON in the browser's localStorage under these keys:
- `nexussplit_splits` - Active split sessions
- `nexussplit_history` - Completed splits
- `nexussplit_session` - Current user session

### Server-Side (JSON files)
When using the Node.js server, data is stored in the `data/` directory:
- `data/splits.json` - Active split sessions
- `data/history.json` - Completed splits

## JSON Data Structure

### Split Object
```json
{
  "id": "unique-id",
  "code": "KyoChonABCD",
  "groupName": "KyoChon Dinner",
  "host": "Sarah",
  "createdAt": "2026-05-16T10:00:00.000Z",
  "status": "active",
  "members": [
    {
      "name": "Sarah",
      "color": "bg-pink-500",
      "initial": "S",
      "paid": false,
      "isHost": true
    }
  ],
  "items": [
    {
      "id": "item-id",
      "name": "Pizza (Large)",
      "price": 40.00,
      "claims": ["Sarah", "Adam"]
    }
  ],
  "paymentQR": {
    "provider": "duitnow",
    "accountName": "Sarah Tan",
    "preview": "data:image/png;base64,..."
  }
}
```

### History Object
```json
{
  "id": "split-id",
  "name": "KyoChon Dinner",
  "host": "Sarah",
  "date": "2026-05-16",
  "completedAt": "2026-05-16T12:00:00.000Z",
  "amount": 150.00,
  "status": "completed",
  "itemCount": 6,
  "memberCount": 4,
  "members": ["Sarah", "Adam", "Mei", "David"]
}
```

## Features

- **Create Split** - Host creates a bill split with payment QR
- **Share Code** - Share via WhatsApp, Telegram, or QR code
- **Join Split** - Members join using the split code
- **Add Items** - Add bill items with tax/service charge
- **Claim Items** - Tap items to claim them (shared splitting)
- **Balance Dashboard** - See who owes what
- **Smart Settlement** - Pay via host's QR code
- **Payment Tracking** - Mark payments as confirmed
- **History** - View completed splits

## API Endpoints (Server Mode)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/splits | List all active splits |
| POST | /api/splits | Create a new split |
| GET | /api/splits/:id | Get a specific split |
| PUT | /api/splits/:id | Update a split |
| DELETE | /api/splits/:id | Delete a split |
| POST | /api/splits/:id/join | Join a split |
| POST | /api/splits/:id/items | Add items |
| POST | /api/splits/:id/claim | Toggle claim |
| POST | /api/splits/:id/pay | Mark as paid |
| POST | /api/splits/:id/complete | Complete split |
| GET | /api/history | Get history |
