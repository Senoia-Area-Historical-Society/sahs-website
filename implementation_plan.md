# Implementation Plan: Senoia Stories Oral History Page

We will create a brand-new page on the SAHS website dedicated to **Senoia Stories: An Oral History Project**, inspired directly by the flyer and logo provided. This page will be beautifully styled to match the premium heritage-inspired aesthetic of the SAHS website (cream/tan/charcoal palette) while incorporating the brand-new project logo asset, rich interactive features, dynamic badges, a direct support/donation CTA, and clear contact avenues.

## Proposed Changes

### 1. Brand Logo Integration: [senoia-stories-logo.png](src/assets/senoia-stories-logo.png)
* Place the monochrome project logo in `src/assets/senoia-stories-logo.png` and import it directly into the page.

---

### 2. New Page: [SenoiaStories.tsx](src/pages/SenoiaStories.tsx)
We will create a new page component `src/pages/SenoiaStories.tsx`.

#### Visual Layout & Features:
* **Two-Column Heritage Hero Header**: Renders a gorgeous desktop grid (collapsing on mobile) that places the new monochrome logo side-by-side with an elegant header intro:
  * **Museum-Photo Style Frame**: The logo is set inside a crisp white card featuring custom rounded corners and subtle vintage photo-corner borders.
  * **Interactive Tag & Title**: Plays on your theme's Playfair Display font styling.
* **Project Introduction**: A compelling description of the oral history project, emphasizing its mission to record, preserve, and celebrate the diverse voices of Senoia.
* **Flyer-Inspired Burst Badges**: A series of premium-styled Tailwind cards/badges with smooth hover animations mimicking the shapes and key callouts of the flyer:
  * **Preserve our town's history!**
  * **Tell your Senoia story!**
* **Project Pillars (Interactive Info Cards)**:
  * 🎙️ **Fund Recordings & Archives**: Details about how donations help purchase recording gear, fund archiving software, and preserve tapes.
  * ⚙️ **Sponsor Gear & Events**: Options for sponsoring recording booths, equipment, and public sharing sessions.
  * 📸 **Share Stories & Photos**: A section encouraging residents to dig up old photographs, diaries, and stories.
* **Premium Donation CTA ("We are calling on your support!")**:
  * An eye-catching, high-contrast banner with the red stamp styling ("DONATE NOW") and a heart icon matching the flyer's call-to-action.
  * Direct Link to the official Stripe Donation checkout (`https://donate.stripe.com/aEU1602kYegp3UQfZ0`).
* **Contact Card**: A clean, modern card highlighting **catnolan@senoiahistory.com** as the point of contact to get involved, schedule an interview, or ask questions.

---

### 3. Navigation Updates: [Header.tsx](src/components/Header.tsx)
To make this new page easily accessible, we will add link integrations in the header:
* **Desktop Navigation**:
  * Add a link under the **Visit** dropdown: `"Senoia Stories Oral History"` to route to `/senoia-stories`.
  * Add a link under the **Support** dropdown: `"Senoia Stories Project (Donate)"` to highlight the fundraising angle.
* **Mobile Drawer Navigation**:
  * Add the links in the respective Visit and Support accordion sections inside the premium mobile drawer.

---

### 4. Route Integration: [App.tsx](src/App.tsx)
* Import the new `SenoiaStories` page.
* Add a public route:
  ```tsx
  <Route path="/senoia-stories" element={<PublicLayout><SenoiaStories /></PublicLayout>} />
  ```

---

## Verification Plan

### Automated/Compiler Checks
* Verify that the React compiler/TypeScript build succeeds:
  ```bash
  wsl npm run build
  ```

### Manual Verification
1. Open `http://localhost:5174/` in the web browser.
2. Check the **Visit** and **Support** dropdowns to ensure the links route correctly to `/senoia-stories`.
3. Open `/senoia-stories` and inspect the layout, logo positioning, typography, responsive scaling, hover states, and standard links.
4. Click the "Donate" button to ensure it opens the official Stripe donation portal.
5. Verify the mobile drawer layout on simulated mobile viewports.
