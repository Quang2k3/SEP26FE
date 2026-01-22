# AI Copilot Instructions for WMS Frontend

This Next.js 16 application is a **Warehouse Management System (WMS) login interface** built with modern React patterns and TypeScript.

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16 with App Router (React 19, TypeScript 5)
- **UI Library**: Ant Design v6 + Tailwind CSS v4
- **Compiler**: React Compiler enabled (Babel plugin)
- **Code Quality**: ESLint 9 with Next.js core web vitals

### Directory Structure
```
src/app/               # Next.js app router routes
├── login/
│   ├── layout.tsx     # Login layout wrapper
│   └── page.tsx       # Login page route (WMS branding + layout)
components/auth/       # Authentication UI components (reusable)
├── LoginForm.tsx      # Form UI only (Ant Design Form + validation)
├── LoginHeader.tsx    # (Placeholder - empty)
├── LoginFooter.tsx    # (Placeholder - empty)
services/              # API service layer
├── auth.service.ts    # (In progress - will contain auth API calls)
contexts/              # React Context for global state
├── AuthContext.tsx    # (In progress - will manage auth state)
```

## Critical Patterns

### Component Responsibility Separation
This codebase enforces **strict separation of concerns**:

1. **Page Components** (`src/app/login/page.tsx`)
   - Layout & presentation only
   - Use `'use server'` by default (SSR-first)
   - Compose smaller UI components
   - Contains comments explaining purpose

2. **UI Components** (`components/auth/LoginForm.tsx`)
   - Use `'use client'` pragma at top
   - Marked with `use client` comment explaining the component's role
   - No business logic - only form validation & UI state
   - Use Ant Design for consistency
   - Example comment structure: `/** Component Name\n * ----------------\n * Purpose & scope\n */`

3. **Services** (`services/auth.service.ts`)
   - API communication layer (planned)
   - Separate from component logic
   - TypeScript interfaces for requests/responses

4. **Contexts** (`contexts/AuthContext.tsx`)
   - Global authentication state (planned)
   - Use `AuthContext` for user session data
   - Pair with React hooks pattern

### Language Conventions
- **Vietnamese comments** are used in code - maintain this for consistency
- File-level comments explain **what** each component handles and **why**
- Comments use `/** */` JSDoc format

## Development Workflow

### Commands
```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint checks
```

### TypeScript Configuration
- **Path alias**: `@/*` maps to `./src/*` - use for absolute imports
- **Strict mode enabled**: All files must pass strict type checking
- **JSX is `react-jsx`**: Don't import React for JSX in .tsx files

### Key Dependencies
- **antd**: Use for all UI components (Button, Form, Input, Alert, Card, Typography)
- **next/font**: Geist Sans/Mono fonts pre-configured - use in layouts
- **React Compiler**: Enabled in `next.config.ts` - improves memoization automatically

## Integration Points (Planned/In Progress)

### Auth Flow (Not yet implemented)
1. **LoginForm** → captures user input, validates
2. **auth.service.ts** → sends credentials to backend API
3. **AuthContext** → stores session token, user info
4. **Protected pages** → check auth state via context

### Expected Service Pattern
```typescript
// auth.service.ts structure (to be implemented)
export const login = async (email: string, password: string) => {
  // Call backend API
  // Return { user, token }
}
```

## Code Quality Standards

### Linting
- Config: `eslint.config.mjs` (Next.js core web vitals + TypeScript)
- ESLint uses flat config format (new in ESLint 9)
- Always lint before committing: `npm run lint`

### Build Configuration
- React Compiler enabled (`reactCompiler: true` in `next.config.ts`)
- Next.js automatic optimizations active

## Common Tasks

### Adding a New Auth Component
1. Create in `components/auth/YourComponent.tsx`
2. Add `'use client'` pragma if using hooks
3. Import Ant Design components from `'antd'`
4. Use TypeScript interfaces for props
5. Add JSDoc comment explaining component scope

### Extending Login Page
1. Modify `src/app/login/page.tsx` for layout
2. Create separate component in `components/auth/` for new content
3. Import component and compose in page

### Adding Auth Service Methods
1. Edit `services/auth.service.ts`
2. Define TypeScript types for request/response
3. Use async/await pattern
4. Export named functions (not class methods)

## Important Notes for AI Agents

- **Do not modify** package.json without discussion (careful with versions)
- **Vietnamese comments expected** - maintain language consistency when updating code
- **Strict TypeScript** - all code must pass strict type checking
- **'use client' required** - for interactive form components
- **Ant Design first** - don't import external UI libraries; use Ant Design
- **Empty files in progress** - LoginHeader.tsx, LoginFooter.tsx, AuthContext.tsx, auth.service.ts are placeholders for future implementation
- **Path aliases** - always use `@/components/auth/...` instead of relative paths in imports
