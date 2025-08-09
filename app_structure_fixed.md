```
app/
├─ (auth)/
│  ├─ _layout.tsx
│  ├─ sign-in.tsx
│  └─ sign-up.tsx
│
├─ _layout.tsx                 # global stack (splash / role router)
├─ index.tsx                   # decides role → redirects to (driver) or (consigner)
├─ +not-found.tsx
│
├─ (driver)/                   # everything driver-facing
│  ├─ _layout.tsx              # role guard: ensures session.role === 'driver'
│  └─ (tabs)/                  # driver bottom tabs
│     ├─ _layout.tsx
│     ├─ home/                 # DRIVER HOME
│     │  └─ index.tsx
│     ├─ jobs/                 # jobs == active auctions from all consigners
│     │  ├─ index.tsx          # list open jobs + vehicle filters
│     │  └─ [id]/index.tsx     # job detail + place/cancel bid
│     ├─ history/              # driver history
│     │  └─ index.tsx          # bids & jobs won
│     └─ profile/              # driver profile
│        └─ index.tsx
│
├─ (consigner)/                # everything consigner-facing
│  ├─ _layout.tsx              # role guard: ensures session.role === 'consigner'
│  └─ (tabs)/                  # consigner bottom tabs
│     ├─ _layout.tsx
│     ├─ home/                 # CONSIGNER HOME
│     │  └─ index.tsx
│     ├─ auctions/
│     │  ├─ index.tsx          # your active auctions
│     │  ├─ create.tsx         # wraps shared <AuctionForm/>
│     │  └─ [id]/edit.tsx      # edit auction screen
│     ├─ history/
│     │  └─ index.tsx          # past/closed auctions
│     └─ profile/
│        └─ index.tsx
│
└─ info/                       # shared static pages (optional in tabs or drawer)
   ├─ index.tsx
   ├─ about.tsx
   ├─ privacy.tsx
   └─ contact.tsx
```
