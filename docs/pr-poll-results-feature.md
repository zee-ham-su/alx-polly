## Poll Results Feature and Poll Creation Form Refactor

This pull request introduces a new feature to view poll results and refactors the poll creation form for better maintainability.

### Key Changes

- Poll Results Page
  - Added a new `getPollResults` function in `app/lib/actions/poll-actions.ts` to fetch poll data along with vote counts for each option.
  - Created a dedicated results page at `app/(dashboard)/polls/[id]/results/page.tsx` to display the poll question, options, and their respective vote percentages and counts.
  - Integrated a “View Results” button on the poll detail page (`app/(dashboard)/polls/[id]/page.tsx`) to navigate to the new results view.

- Poll Creation Form Refactor
  - Extracted the state management and submission logic of the `PollCreateForm` into a new custom hook, `usePollCreationForm` (`app/(dashboard)/create/usePollCreationForm.ts`).
  - This improves separation of concerns, making `PollCreateForm.tsx` cleaner and more focused on rendering the UI.

- Improved Poll Creation Reliability
  - Refactored the `createPoll` function in `app/lib/actions/poll-actions.ts` to reliably retrieve the newly created `pollId` directly from the Supabase insert operation, preventing potential concurrency issues.

These changes enhance the user experience by providing clear poll result visualization and improve the codebase’s structure and reliability.
