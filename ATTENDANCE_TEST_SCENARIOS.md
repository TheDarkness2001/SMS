# Teacher Attendance System - Test Scenarios

## Overview
Complete test scenarios for the Teacher Attendance Records platform covering Test Mode, Production Mode, Admin Panel, and Statistics Dashboard.

---

## Phase 1: Test Mode UI Testing

### Test Scenario 1.1: Consent Modal Display
**Objective**: Verify consent modal appears on first visit to Test Mode

**Steps**:
1. Login as a teacher
2. Navigate to Sidebar > Attendance > Test Mode
3. Verify consent modal appears with title "Teacher Attendance - Production Mode"
4. Verify three checkboxes are visible:
   - 📷 Camera Access
   - 📍 Location Access
   - 💾 Data Storage & Privacy
5. Verify "Agree to All" checkbox is present
6. Verify "Cancel" and "Accept All & Continue" buttons are visible

**Expected Results**:
- ✓ Modal displays correctly
- ✓ All elements are visible and functional
- ✓ Buttons have proper styling (Cancel in gray, Submit in gradient)

---

### Test Scenario 1.2: Consent Validation
**Objective**: Verify consent requires all three permissions

**Steps**:
1. From consent modal, check only Camera Access
2. Click "Accept All & Continue"
3. Verify button is disabled (grayed out)
4. Check Location Access
5. Verify button is still disabled
6. Check Data Storage
7. Verify "Agree to All" checkbox auto-checks
8. Verify button becomes enabled
9. Click "Accept All & Continue"

**Expected Results**:
- ✓ Submit button only enables when all three are checked
- ✓ "Agree to All" checkbox syncs with individual checkboxes
- ✓ Success message appears: "✓ Attendance initialized. Ready for check-in."
- ✓ Modal closes and moves to Photo step

---

### Test Scenario 1.3: Consent Cancellation
**Objective**: Verify canceling consent shows error message

**Steps**:
1. From consent modal, click Cancel button
2. Verify error message displays
3. Wait 5 seconds
4. Verify error message disappears
5. Verify modal is still visible (can retry consent)

**Expected Results**:
- ✓ Error message: "You must accept all permissions to use the attendance system"
- ✓ Modal remains open for retry
- ✓ User can click Accept All & Continue again

---

### Test Scenario 1.4: Photo Upload - Drag & Drop
**Objective**: Verify photo upload via drag and drop

**Steps**:
1. Complete consent and reach Photo step
2. Prepare a test image file (~500KB JPG)
3. Drag image onto photo preview area
4. Verify image appears in preview
5. Verify file is selected
6. Click "✓ Photo Verified - Next"

**Expected Results**:
- ✓ Image displays in preview area
- ✓ Photo Preview section updates
- ✓ Proceeds to Location step
- ✓ Success message: "✓ Photo Verified - Next"

---

### Test Scenario 1.5: Photo Upload - File Input
**Objective**: Verify photo upload via file input click

**Steps**:
1. Complete consent and reach Photo step
2. Click on "Click to upload photo" area
3. Select a test image from device
4. Verify image appears in preview
5. Click "✓ Photo Verified - Next"

**Expected Results**:
- ✓ File dialog opens
- ✓ Image displays correctly after selection
- ✓ Navigation to Location step works
- ✓ Photo persists through workflow

---

### Test Scenario 1.6: Location Manual Input
**Objective**: Verify manual location input in TEST mode

**Steps**:
1. Reach Location step
2. Verify two input fields: Latitude and Longitude
3. Clear latitude field and enter: 28.6139
4. Clear longitude field and enter: 77.2090
5. Verify location preview updates with entered values
6. Click "✓ Location Confirmed - Review"

**Expected Results**:
- ✓ Fields accept decimal inputs
- ✓ Location preview displays: "28.6139, 77.2090"
- ✓ Accuracy shows: "~5-15 meters (TEST mode)"
- ✓ Proceeds to Review step

---

### Test Scenario 1.7: Review & Checkout
**Objective**: Verify review screen and check-in submission

**Steps**:
1. Reach Review step with photo and location
2. Verify review details show:
   - Mode: "🧪 TEST"
   - Photo thumbnail
   - Location coordinates
   - Device type and platform
   - Verification Status: "⏳ Pending Admin Review"
3. Click "✅ Check In Now"
4. Wait for API response
5. Verify success message: "✓ Check-in successful!"
6. Verify step changes to "checkout-wait"

**Expected Results**:
- ✓ All details display correctly
- ✓ API call made to `/api/teacher-attendance/:id/check-in`
- ✓ Attendance record updated with check-in time
- ✓ Button shows "👋 Check Out Now" option

---

### Test Scenario 1.8: Checkout Workflow
**Objective**: Verify check-out functionality

**Steps**:
1. From checkout-wait state, click "👋 Check Out Now"
2. Wait for API response
3. Verify success message: "✓ Check-out successful!"
4. Verify completion card displays:
   - Check-in time
   - Check-out time
   - Duration in minutes
   - Message: "✓ Your attendance has been recorded and verified"

**Expected Results**:
- ✓ Duration calculated correctly (e.g., "45 minutes")
- ✓ API call made to `/api/teacher-attendance/:id/check-out`
- ✓ Success card shows green gradient background
- ✓ User can refresh page without loss of data

---

### Test Scenario 1.9: Error Handling - No Photo
**Objective**: Verify error when trying to check-in without photo

**Steps**:
1. Complete consent and location steps
2. Skip photo upload
3. Click "Next" without uploading
4. Verify error message: "Please upload a photo for verification"

**Expected Results**:
- ✓ Error message displays
- ✓ User stays on photo step
- ✓ Can proceed after uploading photo

---

### Test Scenario 1.10: Responsive Design - Mobile
**Objective**: Verify test mode works on mobile viewport

**Steps**:
1. Open DevTools and set viewport to iPhone 12 (390x844)
2. Navigate to Test Mode
3. Complete consent workflow
4. Verify all elements are visible without horizontal scroll
5. Test photo upload
6. Test location input
7. Test check-in button

**Expected Results**:
- ✓ All content is readable
- ✓ Buttons are appropriately sized (min 44px height)
- ✓ Modal dialog is responsive
- ✓ No layout breaking

---

## Phase 2: Production Mode UI Testing

### Test Scenario 2.1: Camera Permission Request
**Objective**: Verify browser camera permission flow

**Steps**:
1. Login as teacher
2. Navigate to Sidebar > Attendance > Production Mode
3. Complete consent modal
4. Reach Camera step
5. Click "📷 Start Camera"
6. Accept browser camera permission prompt
7. Verify video stream displays in camera container

**Expected Results**:
- ✓ Browser permission dialog appears
- ✓ Camera video stream displays live
- ✓ Frame shows "Capture Photo" and "Stop Camera" buttons
- ✓ No console errors

---

### Test Scenario 2.2: Camera Permission Denied
**Objective**: Verify error handling when camera access denied

**Steps**:
1. Reach Camera step in Production Mode
2. Click "📷 Start Camera"
3. Deny camera permission in browser prompt
4. Verify error message displays

**Expected Results**:
- ✓ Error message: "Camera permission denied. Please allow camera access and try again."
- ✓ Can retry by clicking "📷 Start Camera" again
- ✓ User can change browser permissions and retry

---

### Test Scenario 2.3: Photo Capture from Camera
**Objective**: Verify photo capture from live video stream

**Steps**:
1. Start camera (permission granted)
2. Position face in camera frame
3. Click "📸 Capture Photo"
4. Verify success message: "✓ Photo captured successfully!"
5. Verify captured photo displays in container
6. Verify "🔄 Retake Photo" button appears

**Expected Results**:
- ✓ Photo captured from video frame
- ✓ Image displays clearly
- ✓ Can retake photo or proceed to location
- ✓ Canvas rendering works correctly

---

### Test Scenario 2.4: Retake Photo
**Objective**: Verify ability to retake photo without restarting camera

**Steps**:
1. Capture a photo
2. Click "🔄 Retake Photo"
3. Verify captured photo clears
4. Verify camera video stream resumes
5. Capture a new photo
6. Verify new photo displays

**Expected Results**:
- ✓ Old photo is cleared
- ✓ Camera remains active
- ✓ No need to request permission again
- ✓ New photo replaces old one

---

### Test Scenario 2.5: GPS Location Capture
**Objective**: Verify browser GPS permission and location capture

**Steps**:
1. Reach Location step in Production Mode
2. Click "📍 Get My Location"
3. Accept browser location permission
4. Wait for location fix (2-5 seconds)
5. Verify location details display:
   - Latitude (6 decimal places)
   - Longitude (6 decimal places)
   - Accuracy (±X meters)

**Expected Results**:
- ✓ Browser permission dialog appears
- ✓ Location coordinates display with precision
- ✓ Accuracy shows reasonable value (±10-30m typical)
- ✓ "Recapture Location" button available

---

### Test Scenario 2.6: GPS Permission Denied
**Objective**: Verify error handling when GPS denied

**Steps**:
1. Reach Location step
2. Click "📍 Get My Location"
3. Deny location permission
4. Verify error message displays

**Expected Results**:
- ✓ Error message: "Location permission denied. Please enable location access and try again."
- ✓ Can retry after enabling permissions
- ✓ No silent failures

---

### Test Scenario 2.7: Production Mode Check-in
**Objective**: Verify complete production mode workflow

**Steps**:
1. Complete consent → Camera → Location steps
2. Reach Review with photo and GPS location
3. Verify review shows:
   - Mode: "🚀 PRODUCTION"
   - Captured photo
   - GPS coordinates with accuracy
   - Device information
   - Status: "✓ Verified"
4. Click "✅ Check In Now"

**Expected Results**:
- ✓ API call includes:
   - Photo (base64 or file)
   - GPS location with accuracy
   - User agent and platform
   - Device type
- ✓ Success message: "✓ Check-in successful!"
- ✓ Mode set to "production" in database

---

### Test Scenario 2.8: Production Mode Check-out
**Objective**: Verify check-out with fresh photo and location

**Steps**:
1. After check-in, reach checkout-wait state
2. Click "📷 Recapture for Checkout"
3. Capture new photo
4. Skip location (use previous)
5. Click "👋 Check Out Now"

**Expected Results**:
- ✓ New photo captured successfully
- ✓ Check-out record created with new photo
- ✓ Duration shows accurate time elapsed
- ✓ Both check-in and check-out photos stored

---

### Test Scenario 2.9: Poor GPS Accuracy Warning
**Objective**: Verify warning for poor GPS accuracy

**Steps**:
1. Reach Location step
2. Get location with accuracy > 50m
3. Verify info message displays

**Expected Results**:
- ✓ Message: "ℹ️ Location accuracy is XXm. Please ensure you have a clear view of the sky..."
- ✓ User can still proceed
- ✓ Warning is informational, not blocking

---

### Test Scenario 2.10: Responsive Design - Production Mobile
**Objective**: Verify production mode works on mobile

**Steps**:
1. Set viewport to iPhone 12
2. Navigate to Production Mode
3. Complete camera capture (use DevTools camera simulation)
4. Test location input
5. Verify all buttons are accessible

**Expected Results**:
- ✓ Video stream scales appropriately
- ✓ All buttons are touch-friendly (44px minimum)
- ✓ No layout issues
- ✓ Modals display correctly

---

## Phase 3: Admin Panel Testing

### Test Scenario 3.1: Admin Panel Access
**Objective**: Verify admin access control

**Steps**:
1. Login as admin user
2. Navigate to Sidebar > Attendance > Admin Panel
3. Verify admin panel loads

**Expected Results**:
- ✓ Page loads successfully
- ✓ Filter controls visible
- ✓ Records table displays

---

### Test Scenario 3.2: Filter by Status
**Objective**: Verify filtering by attendance status

**Steps**:
1. Open Admin Panel
2. Click "Status" dropdown
3. Select "Present"
4. Verify table updates to show only Present records
5. Try "Absent" filter
6. Verify table updates

**Expected Results**:
- ✓ Dropdown shows options: All, Present, Late, Absent, Half-Day
- ✓ Table filters correctly
- ✓ Record count updates

---

### Test Scenario 3.3: Filter by Verification Status
**Objective**: Verify verification status filtering

**Steps**:
1. Open Admin Panel
2. Click "Verification Status" dropdown
3. Select "Needs Review"
4. Verify only pending records show
5. Try "Verified" filter

**Expected Results**:
- ✓ Shows records with matching verification status
- ✓ Options: All, Verified, Needs Review, Rejected, Pending
- ✓ Counts update correctly

---

### Test Scenario 3.4: Filter by Mode
**Objective**: Verify Test vs Production mode filtering

**Steps**:
1. Open Admin Panel
2. Click "Mode" dropdown
3. Select "🧪 Test"
4. Verify only test mode records show
5. Select "🚀 Production"
6. Verify only production records show

**Expected Results**:
- ✓ Filters work correctly
- ✓ Test and production records separated
- ✓ Can compare modes

---

### Test Scenario 3.5: Date Range Filtering
**Objective**: Verify date range filtering

**Steps**:
1. Open Admin Panel
2. Click "Start Date" field
3. Select a date (e.g., 5 days ago)
4. Click "End Date" field
5. Select today's date
6. Verify records in date range show

**Expected Results**:
- ✓ Date pickers work
- ✓ Records filtered by date
- ✓ Can clear dates and reset

---

### Test Scenario 3.6: View Record Details
**Objective**: Verify detail modal opens with record information

**Steps**:
1. Open Admin Panel
2. Click "👁️ View" button on any record
3. Verify detail modal opens
4. Verify modal has 4 tabs: Details, Photos, Verification, Audit

**Expected Results**:
- ✓ Modal displays smoothly
- ✓ All tabs visible
- ✓ Can switch between tabs

---

### Test Scenario 3.7: Details Tab
**Objective**: Verify Details tab shows all record information

**Steps**:
1. Open detail modal
2. Click Details tab (if not active)
3. Verify displays:
   - Teacher name and ID
   - Check-in time
   - Check-out time
   - Duration
   - Status
   - Mode (Test/Production)
   - Device info

**Expected Results**:
- ✓ All information displays
- ✓ Timestamps formatted correctly
- ✓ Status badge shows correct color
- ✓ Mode badge shows correct icon

---

### Test Scenario 3.8: Photos Tab
**Objective**: Verify Photos tab shows captured images

**Steps**:
1. Open detail modal
2. Click Photos tab
3. Verify shows:
   - Check-in photo
   - Check-out photo (if exists)
4. Click on photo to view full size

**Expected Results**:
- ✓ Photos display as thumbnails
- ✓ Can preview full-size images
- ✓ Placeholder if no photo exists

---

### Test Scenario 3.9: Verification Tab
**Objective**: Verify Verification tab shows verification details

**Steps**:
1. Open detail modal
2. Click Verification tab
3. Verify shows status of:
   - Face verification
   - Location verification
   - Device verification
4. If rejected, verify shows rejection reason

**Expected Results**:
- ✓ Verification status displays
- ✓ Rejection reasons visible
- ✓ Can approve/reject from this tab

---

### Test Scenario 3.10: Audit Tab
**Objective**: Verify Audit tab shows action history

**Steps**:
1. Open detail modal
2. Click Audit tab
3. Verify shows timeline of actions:
   - Action type (created, checked-in, approved, etc.)
   - Actor (who performed action)
   - Timestamp
   - Device info

**Expected Results**:
- ✓ Chronological order
- ✓ All actions logged
- ✓ Complete audit trail

---

### Test Scenario 3.11: Approve Record
**Objective**: Verify admin can approve records

**Steps**:
1. Open detail modal for a "Needs Review" record
2. Click "✓ Approve" button
3. Verify success message
4. Verify record status changes to "Verified"
5. Verify modal closes or updates

**Expected Results**:
- ✓ API call successful
- ✓ Verification status updated
- ✓ Audit trail updated
- ✓ Modal reflects changes

---

### Test Scenario 3.12: Reject Record
**Objective**: Verify admin can reject with reason

**Steps**:
1. Open detail modal for a "Needs Review" record
2. Click "✗ Reject" button
3. Verify rejection reason field appears
4. Enter reason: "Face verification failed"
5. Click confirm
6. Verify rejection recorded

**Expected Results**:
- ✓ Modal shows reason input
- ✓ Reason saved with rejection
- ✓ Verification status shows "Rejected"
- ✓ Rejection reason visible in Verification tab

---

### Test Scenario 3.13: Add Notes
**Objective**: Verify admin can add notes to records

**Steps**:
1. Open detail modal
2. Click "Add Notes" button
3. Type: "Photo quality good, location verified"
4. Save notes
5. Verify notes persist on page refresh

**Expected Results**:
- ✓ Notes field appears
- ✓ Can save and edit notes
- ✓ Notes visible to other admins
- ✓ Timestamp recorded

---

### Test Scenario 3.14: Pagination
**Objective**: Verify record pagination works

**Steps**:
1. Open Admin Panel
2. Verify "20 records per page" dropdown
3. Change to 50 records
4. Verify page reloads with new limit
5. If more than 50 records, verify next page button

**Expected Results**:
- ✓ Records per page option works
- ✓ Can navigate between pages
- ✓ Total record count shown
- ✓ Page persists on filter changes

---

## Phase 4: Statistics Dashboard Testing

### Test Scenario 4.1: Dashboard Load
**Objective**: Verify statistics dashboard loads with data

**Steps**:
1. Login as admin
2. Navigate to Sidebar > Attendance > Statistics
3. Verify dashboard loads
4. Verify stats cards display:
   - Total Records
   - Verified
   - Needs Review
   - Rejected

**Expected Results**:
- ✓ All stat cards visible
- ✓ Numbers display correctly
- ✓ Percentages calculated
- ✓ Color coding applied (green, yellow, red)

---

### Test Scenario 4.2: Time Range Selection
**Objective**: Verify time range buttons work

**Steps**:
1. Open Statistics dashboard
2. Click "Last 7 Days" button
3. Verify stats update
4. Click "This Month"
5. Verify stats update
6. Click "All Time"
7. Verify stats update

**Expected Results**:
- ✓ Buttons highlight when selected
- ✓ Data updates with each selection
- ✓ Stats accurate for time range
- ✓ No console errors

---

### Test Scenario 4.3: Custom Date Range
**Objective**: Verify custom date range filtering

**Steps**:
1. Open Statistics dashboard
2. Locate date input fields (From/To)
3. Enter From: 5 days ago
4. Enter To: today
5. Verify stats update for date range

**Expected Results**:
- ✓ Date inputs work
- ✓ Stats reflect date range
- ✓ Can clear and reset
- ✓ Updates automatically

---

### Test Scenario 4.4: Status Distribution
**Objective**: Verify status breakdown visualization

**Steps**:
1. Open Statistics dashboard
2. Scroll to "Status Distribution" section
3. Verify bars show:
   - Present (green)
   - Late (yellow)
   - Absent (red)
4. Verify percentages add up to 100%

**Expected Results**:
- ✓ All statuses displayed
- ✓ Bars scale correctly
- ✓ Percentages accurate
- ✓ Color coding clear

---

### Test Scenario 4.5: Verification Breakdown
**Objective**: Verify verification status distribution

**Steps**:
1. Open Statistics dashboard
2. Look for "Verification Status" section
3. Verify shows count of:
   - Verified
   - Needs Review
   - Rejected
   - Pending

**Expected Results**:
- ✓ All statuses shown
- ✓ Counts accurate
- ✓ Totals match admin panel
- ✓ Cards show key metrics

---

### Test Scenario 4.6: Mode Comparison
**Objective**: Verify Test vs Production comparison

**Steps**:
1. Open Statistics dashboard
2. Look for "Mode Comparison" section
3. Verify shows:
   - Test mode count
   - Production mode count
   - Percentage distribution

**Expected Results**:
- ✓ Both modes shown
- ✓ Accurate counts
- ✓ Percentages calculated correctly
- ✓ Visual representation clear

---

### Test Scenario 4.7: Key Performance Indicators
**Objective**: Verify KPI metrics display

**Steps**:
1. Open Statistics dashboard
2. Look for KPI section
3. Verify shows:
   - Verification rate %
   - Attendance rate %
   - Action required count
   - Records in review count

**Expected Results**:
- ✓ All KPIs visible
- ✓ Values calculate correctly
- ✓ Helpful for admin decision-making
- ✓ Clear visual hierarchy

---

### Test Scenario 4.8: Responsive Charts
**Objective**: Verify charts are responsive

**Steps**:
1. Open Statistics on desktop (1920px)
2. Verify charts display clearly
3. Resize to tablet (768px)
4. Verify charts reflow
5. Resize to mobile (390px)
6. Verify readable on small screen

**Expected Results**:
- ✓ Charts scale appropriately
- ✓ Labels readable on all sizes
- ✓ No overlapping elements
- ✓ Touch-friendly on mobile

---

### Test Scenario 4.9: Summary Section
**Objective**: Verify summary insights display

**Steps**:
1. Open Statistics dashboard
2. Scroll to bottom for summary
3. Verify shows key insights:
   - Top status
   - Highest verification issue
   - Trend information

**Expected Results**:
- ✓ Summary displays meaningful insights
- ✓ Helps admins understand data quickly
- ✓ Actionable information provided
- ✓ Professional presentation

---

### Test Scenario 4.10: Performance
**Objective**: Verify dashboard performs well with large datasets

**Steps**:
1. Open Statistics dashboard
2. Select "All Time" (largest dataset)
3. Measure page load time (should be <2 seconds)
4. Verify no lag when changing time ranges
5. Check browser performance (no heavy CPU usage)

**Expected Results**:
- ✓ Page loads in <2 seconds
- ✓ Smooth transitions between time ranges
- ✓ No console errors
- ✓ Responsive to user input

---

## Phase 5: Integration & End-to-End Testing

### Test Scenario 5.1: Complete Test Mode Workflow
**Objective**: Full workflow from consent to completion

**Steps**:
1. Login as teacher
2. Navigate to Test Mode
3. Accept consent
4. Upload photo
5. Enter location manually
6. Review and check-in
7. Check-out
8. Verify completion

**Expected Results**:
- ✓ All steps execute without errors
- ✓ Data persists through workflow
- ✓ Records appear in admin panel
- ✓ Statistics update

---

### Test Scenario 5.2: Complete Production Mode Workflow
**Objective**: Full workflow with camera and GPS

**Steps**:
1. Login as teacher
2. Navigate to Production Mode
3. Accept consent
4. Start camera and capture photo
5. Get GPS location
6. Review and check-in
7. Check-out with new photo
8. Verify completion

**Expected Results**:
- ✓ Camera and GPS integration works
- ✓ Data accuracy meets requirements
- ✓ Records properly categorized as "production"
- ✓ Accessible in admin panel with mode filter

---

### Test Scenario 5.3: Admin Review Workflow
**Objective**: Admin reviewing and approving records

**Steps**:
1. Complete Test Mode workflow as teacher
2. Login as admin
3. Go to Admin Panel
4. Find teacher's record
5. Review details, photos, verification
6. Approve record
7. Go to Statistics
8. Verify record counted in metrics

**Expected Results**:
- ✓ Record visible to admin immediately
- ✓ All details accessible
- ✓ Approval updates records
- ✓ Statistics reflect changes

---

### Test Scenario 5.4: Multiple Teachers
**Objective**: System handles multiple teachers correctly

**Steps**:
1. Complete Test Mode as Teacher A
2. Switch to Teacher B (different login)
3. Complete Test Mode as Teacher B
4. Login as admin
5. Verify both records in Admin Panel
6. Filter by teacher if available
7. Verify separate records maintained

**Expected Results**:
- ✓ Records separate by teacher
- ✓ No data mixing
- ✓ Each teacher sees only own records (in their own interface)
- ✓ Admin sees all records

---

### Test Scenario 5.5: Data Security
**Objective**: Verify sensitive data is protected

**Steps**:
1. Complete attendance with photo and location
2. Open browser DevTools Network tab
3. Verify photo is not logged in plain text
4. Verify location data encrypted in transit
5. Check stored data in admin panel (photos blurred or with watermark)

**Expected Results**:
- ✓ Photos transferred over HTTPS
- ✓ Sensitive data encrypted
- ✓ Access logs maintained
- ✓ GDPR-compliant display

---

### Test Scenario 5.6: Error Recovery
**Objective**: System handles errors gracefully

**Steps**:
1. Start Test Mode workflow
2. Simulate network error mid-upload
3. Verify error message displays
4. Verify user can retry
5. Complete workflow successfully

**Expected Results**:
- ✓ Error messages are clear
- ✓ No data loss
- ✓ Retry mechanism works
- ✓ No stuck states

---

## Test Data Requirements

### Sample Teacher Records
```json
{
  "teacher_id": "T001",
  "teacher_name": "John Doe",
  "date": "2025-12-17",
  "mode": "test",
  "checkInTime": "09:00 AM",
  "checkOutTime": "05:30 PM",
  "status": "present",
  "verificationStatus": "verified"
}
```

### Sample Admin Records
```json
{
  "teacher_id": "T002",
  "teacher_name": "Jane Smith",
  "date": "2025-12-17",
  "mode": "production",
  "checkInTime": "08:45 AM",
  "checkOutTime": "06:00 PM",
  "status": "present",
  "verificationStatus": "needs-review",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 15.5
  }
}
```

---

## Browser Compatibility Testing

**Browsers to Test**:
- Chrome 120+ (Windows, macOS, Android)
- Firefox 121+ (Windows, macOS, Linux)
- Safari 17+ (macOS, iOS)
- Edge 120+ (Windows)

**OS Compatibility**:
- Windows 11
- macOS 14+
- Ubuntu 22.04+
- iOS 17+
- Android 12+

---

## Performance Benchmarks

| Operation | Expected Time |
|-----------|---|
| Consent Modal Display | <500ms |
| Photo Upload | <2s |
| Location Capture | <5s |
| Check-in API Call | <1.5s |
| Admin Panel Load | <2s |
| Filter Update | <1s |
| Statistics Load | <2s |

---

## Known Limitations & Notes

1. **Test Mode**: Location is manually entered, not verified against actual location
2. **Camera**: Requires HTTPS in production (works on localhost http)
3. **GPS**: Accuracy varies by device, environment, and weather
4. **Photos**: Stored as base64 in TEST mode (production should use external storage)
5. **Time Zones**: System uses browser's local timezone
6. **Offline**: Features require active internet connection

---

## Sign-off Checklist

- [ ] All Phase 1 (Test Mode) tests passed
- [ ] All Phase 2 (Production Mode) tests passed
- [ ] All Phase 3 (Admin Panel) tests passed
- [ ] All Phase 4 (Statistics) tests passed
- [ ] All Phase 5 (Integration) tests passed
- [ ] Browser compatibility verified
- [ ] Mobile responsiveness tested
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Ready for production deployment

---

## Test Execution Summary

**Total Test Cases**: 60
**Critical Tests**: 20
**High Priority**: 25
**Medium Priority**: 15

**Estimated Testing Time**: 8-10 hours per tester

---

*Last Updated: December 17, 2025*
*Document Version: 1.0*
