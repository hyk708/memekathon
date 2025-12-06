# Project Workflow for Collaboration

This document outlines the development workflow, designed to allow a CSS developer and a React developer to work in parallel with minimal friction.

## 1. Core Principle: Separation of Concerns

- **React Developer (`.tsx` files):** Focuses on component logic, state management, and generating the correct HTML structure with appropriate class names.
- **CSS Developer (`.css` files):** Focuses on styling, layout, and appearance, using a static HTML file as a live preview.

---

## 2. Folder Structure

The project's front-end styling is centralized in the `fe/src/styles/` directory.

```
/fe/src/
├── components/      (React components live here)
├── pages/           (React page components live here)
├── styles/          <- CSS DEVELOPER'S PRIMARY WORKSPACE
│   ├── main.css         (Imports all other CSS files)
│   ├── _variables.css   (Contains all shared values like colors, fonts)
│   ├── _base.css        (Global styles for body, h1, etc.)
│   └── components/
│       ├── _navigation.css
│       ├── _buttons.css
│       └── _cards.css
│       └── ... (other component styles)
│
├── App.tsx
└── main.tsx         (This is where main.css is imported into the app)
```

---

## 3. Workflow for CSS Developer

Your goal is to style the UI without needing to run the React application.

**Your Entire Workflow:**

1.  **Work exclusively inside the `fe/src/styles/` directory.**
2.  **Open `fe/style-guide.html` in your web browser.** This is your live preview canvas.
3.  **Edit the `.css` files** in the `styles` directory to change the appearance of the elements in the style guide.
4.  **Refresh your browser** to see your CSS changes instantly.
5.  When a new component needs styling, the React developer will first add its basic HTML structure to `style-guide.html` for you.
6.  Once you are happy with your changes, commit them to your Git branch.

You do **not** need to touch any `.tsx` files or run any `npm` commands.

---

## 4. Workflow for React Developer

Your goal is to build functional components and ensure they have the correct structure and class names for the CSS to apply correctly.

**Your Entire Workflow:**

1.  **Work primarily in the `fe/src/components/` and `fe/src/pages/` directories.**
2.  When creating a new component (e.g., `UserProfile.tsx`), determine the necessary HTML structure and class names (e.g., `<div className="profile-card">`).
3.  **Update the Style Guide:** Add the raw HTML and class name structure of your new component to `fe/style-guide.html`. This gives the CSS developer a target to style.
4.  **Develop the Component:** Build your `.tsx` component to produce the exact same HTML structure and `className`s as you defined in the style guide.
5.  **Run the App:** Use `npm run dev` to see your components working with the styles applied.
6.  **Integrate Changes:** When the CSS developer has finished their work, merge their Git branch into your main development branch. The styles will automatically appear in the app because `main.css` is imported globally in `main.tsx`.

---

## 5. Git Collaboration Process

1.  **Create a branch** for the CSS work (e.g., `git checkout -b feature/css-redesign`).
2.  The CSS developer works on this branch, committing their changes to the `.css` files.
3.  When the styling work is complete, the CSS developer pushes the branch.
4.  The React developer reviews the changes and **merges the branch** into the main development line.
