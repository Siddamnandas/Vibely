# Manual Testing Guide for Photo Selection Feature

This guide explains how to manually test the new photo selection feature for AI cover regeneration.

## Prerequisites

1. Ensure the development server is running (`npm run dev`)
2. Access the application through the preview browser

## Testing Steps

### 1. Access the Playlist Detail Overlay

1. Navigate to the Library page
2. Select any playlist to open the Playlist Detail Overlay
3. Verify that you can see the "Regenerate Covers" button

### 2. Test the Photo Selection Feature

1. Click the "Regenerate Covers" button
2. In the modal that appears, you should see:
   - A photo gallery component for selecting photos
   - A "Start" button that is initially disabled
3. Select a photo from the gallery
4. Verify that the "Start" button becomes enabled
5. Click the "Start" button to begin regeneration

### 3. Verify Background Processing

1. After starting regeneration, observe the progress indicators:
   - The regeneration chip should show progress
   - Individual tracks should show their regeneration status
2. Wait for the regeneration to complete
3. Verify that new AI-generated covers are displayed

### 4. Test Without Photo Selection (Backward Compatibility)

1. Click the "Regenerate Covers" button again
2. This time, do not select any photo
3. Verify that the "Start" button remains disabled
4. Close the modal without starting regeneration

## Expected Behavior

- When a photo is selected, AI-generated covers should be created
- When no photo is selected, the regeneration should fall back to random covers
- The UI should provide clear feedback during the regeneration process
- Existing functionality (pause, resume, cancel) should continue to work

## Troubleshooting

If you encounter any issues:

1. Check the browser console for error messages
2. Verify that all dependencies are properly installed
3. Ensure the Genkit AI service is properly configured
4. Check that the photo gallery component is loading images correctly

## Success Criteria

- [ ] Photo selection UI appears in regeneration modal
- [ ] Start button is disabled until a photo is selected
- [ ] AI-generated covers are created when a photo is selected
- [ ] Random covers are created when no photo is selected
- [ ] Progress indicators work correctly
- [ ] All existing regeneration controls work as expected
