# Issue: Auth Page & Role Registration Enhancements

**Status:** Completed ✔️

## What We Have Done
- **CSS Variable Optimization**: Refactored duplicated CSS colors and hardcoded styles across the entire project (`LearningPortal`, `AuthPage`, `AdminPortal`, etc.) into central, dynamic CSS variables.
- **Glassmorphism Auth Cards**: Streamlined the Student/Instructor role selection cards in the Auth page with frosted glass styling and smooth transitions to seamlessly match the rest of the application.
- **Dynamic Multi-Step Layout**: Overhauled the multi-step registration layout. Instructors now only have a targeted 2-step process without the student 'Vision' step.
- **Role-Specific Fields**: Added new Instructor-specific inputs: 'Courses provided', 'LinkedIn Profile', and 'Other Social / Website', while dynamically hiding the student-specific inputs for them.
- **Dynamic Step Indicators**: Fixed the alignment and spacing of the step progress indicator, stripping out hardcoded widths to make it perfectly stretch and dynamically center for both 2-step and 3-step layouts. 
- **Gradient Fades**: Added an elegant gradient fade to the step progress lines.
- **Early Email Validation**: Implemented an early backend email validation check (`/api/auth/check-email`) that catches duplicate emails seamlessly on step 1 of the registration process before the user wastes time filling out the rest of the form.
- **End-to-End Data Binding**: Wired all the new frontend fields (College, Track, LinkedIn, Courses, etc.) directly to the backend payload and updated the Mongoose `User` schema so all data is now permanently saved into the database upon registration.

- **UI Consistency Fixes**: Standardized the toggle buttons (e.g. Auth page theme toggle now perfectly matches TopNav), fixed input padding overlapping with icons in custom selects/inputs, and resolved the loading button text state (displaying "Signing in..." correctly).
- **Notification Functionality**: Restored the missing notification dropdown menu in the Student Layout. Added a smooth, animated entrance for the dropdown (fade-in, slide-up, and an invisible hover bridge) to make it easily reachable. Added a global "Clear all" button to dismiss notifications anywhere.

## Next Steps / What We Are Doing
- *[Track next steps here]*
