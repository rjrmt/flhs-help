# Student Roster Management System

## 🎯 Overview

The Educational Management Hub includes a comprehensive student roster management system that allows you to import, manage, and maintain student data efficiently. This system supports multiple implementation methods to fit your institution's needs.

## 🚀 Quick Start

### 1. Access Admin Panel
- Navigate to `/admin` from the main dashboard
- Click the "Admin" tile (Settings icon)

### 2. Import Student Roster
- Download the CSV template
- Fill in your student data
- Upload the CSV file
- Review and import to database

## 📊 Implementation Methods

### **Method 1: CSV Import (Recommended)**
**Best for:** Bulk imports, initial setup, periodic updates

**Features:**
- ✅ CSV template with all required fields
- ✅ Data validation and error reporting
- ✅ Bulk import with batch operations
- ✅ Duplicate detection and handling
- ✅ Preview before import
- ✅ Import statistics and error logs

**CSV Format:**
```csv
id,first_name,last_name,grade,homeroom,pbis_points,email,phone,parent_name,parent_phone,parent_email,photo_url
1234567890,John,Smith,12,A-201,45,john.smith@student.edu,555-1234,Jane Smith,555-1234,jane.smith@email.com,/images/john-smith.jpg
```

### **Method 2: Direct Database Management**
**Best for:** Real-time updates, individual student management

**Features:**
- ✅ Individual student CRUD operations
- ✅ Real-time data updates
- ✅ Search and filter capabilities
- ✅ Bulk operations
- ✅ Data validation
- ✅ Export functionality

### **Method 3: API Integration**
**Best for:** Integration with existing SIS (Student Information System)

**Features:**
- ✅ RESTful API endpoints
- ✅ Webhook support for real-time sync
- ✅ Authentication and authorization
- ✅ Rate limiting and error handling
- ✅ Data transformation and mapping

## 🗄️ Database Structure

### Firestore Collections

**Students Collection:** `/artifacts/educational-management-hub/public/data/students/`
```typescript
{
  id: string;                    // Student ID (10 digits)
  firstName: string;             // Student first name
  lastName: string;              // Student last name
  grade: string;                 // Grade level
  homeroom: string;              // Homeroom assignment
  pbisPoints: number;            // PBIS points
  photoUrl?: string;             // Student photo URL
  email?: string;                // Student email
  phone?: string;                // Student phone
  parentName?: string;           // Parent/guardian name
  parentPhone?: string;          // Parent phone
  parentEmail?: string;          // Parent email
  ttsCount: number;              // Tardy to School count
  ttcCount: number;              // Tardy to Class count
  lastTardy?: string;            // Last tardy date
  ruleTriggered?: string;        // Current rule trigger
  alerts?: Array<{               // Student alerts
    type: string;
    level: 'warning' | 'info';
    text: string;
  }>;
  schedule?: Array<{             // Class schedule
    period: string;
    course: string;
    room: string;
    teacher: string;
    days: string;
  }>;
  lastUpdated: string;           // Last update timestamp
}
```

## 🔧 Setup Instructions

### 1. Firebase Configuration

**Environment Variables (.env.local):**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_APP_ID=educational-management-hub
```

### 2. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public student data - read only for most users
    match /artifacts/{appId}/public/data/students/{studentId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // Admin logs - admin only
    match /artifacts/{appId}/public/logs/{logType}/{logId} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // User-specific tardy logs
    match /artifacts/{appId}/users/{userId}/tardyLogs/{logId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}
```

### 3. Authentication Setup

**For Admin Access:**
```javascript
// Create custom token with admin claim
const adminToken = await admin.auth().createCustomToken(uid, {
  admin: true
});
```

## 📋 CSV Import Process

### Step 1: Prepare Your Data
1. Download the CSV template from the admin panel
2. Fill in student information:
   - **Required:** ID, First Name, Last Name, Grade, Homeroom
   - **Optional:** PBIS Points, Email, Phone, Parent Info, Photo URL

### Step 2: Validate Data
- Student IDs must be exactly 10 digits
- All required fields must be filled
- Email addresses must be valid format
- Phone numbers should follow standard format

### Step 3: Import Process
1. Upload CSV file
2. Review validation results
3. Fix any errors
4. Preview student data
5. Import to database

### Step 4: Verify Import
- Check import statistics
- Review error logs
- Test student lookup functionality

## 🔄 Data Management

### Regular Updates
- **Daily:** Sync with SIS for attendance changes
- **Weekly:** Update PBIS points and behavior records
- **Monthly:** Review and update student schedules
- **Semester:** Bulk import new students, archive graduates

### Backup Strategy
- **Automated:** Daily Firestore exports
- **Manual:** CSV exports before major changes
- **Version Control:** Track changes with timestamps

### Data Validation
- **Real-time:** Client-side validation on input
- **Batch:** Server-side validation on import
- **Scheduled:** Automated data integrity checks

## 🛠️ Advanced Features

### Search and Filter
```typescript
// Search students by name or ID
const students = await studentService.searchStudents('Smith');

// Get students by grade
const seniors = await studentService.getStudentsByGrade('12');

// Get students by homeroom
const homeroomA201 = await studentService.getStudentsByHomeroom('A-201');
```

### Bulk Operations
```typescript
// Bulk import students
const result = await studentService.bulkImportStudents(studentArray);

// Export to CSV
const csvData = studentService.exportToCSV(students);
```

### Statistics and Reporting
```typescript
// Get roster statistics
const stats = await studentService.getRosterStats();
// Returns: totalStudents, byGrade, byHomeroom, averagePbisPoints, studentsWithAlerts
```

## 🚨 Error Handling

### Common Issues and Solutions

**"Student ID must be exactly 10 digits"**
- Ensure all student IDs are 10-digit numbers
- Check for leading zeros or formatting issues

**"Required field missing"**
- Verify all required fields are filled
- Check for empty cells or whitespace

**"Invalid email format"**
- Validate email addresses
- Check for typos in domain names

**"Duplicate student ID"**
- Remove duplicate entries
- Check for data entry errors

## 📈 Performance Optimization

### Batch Operations
- Use Firestore batch writes for bulk imports
- Limit batch size to 500 operations
- Implement retry logic for failed operations

### Caching Strategy
- Cache frequently accessed student data
- Implement pagination for large datasets
- Use Firestore offline persistence

### Monitoring
- Track import success rates
- Monitor database read/write operations
- Set up alerts for failed operations

## 🔐 Security Considerations

### Access Control
- Admin-only access to import functions
- Role-based permissions
- Audit logging for all changes

### Data Privacy
- Encrypt sensitive student information
- Implement data retention policies
- Comply with FERPA regulations

### Backup and Recovery
- Regular automated backups
- Point-in-time recovery options
- Disaster recovery procedures

## 📞 Support and Maintenance

### Troubleshooting
- Check browser console for errors
- Verify Firebase configuration
- Test with demo data first

### Updates and Maintenance
- Regular dependency updates
- Security patch management
- Performance monitoring

### Training Resources
- Admin user guide
- Video tutorials
- Best practices documentation

---

## 🎯 Next Steps

1. **Set up Firebase project** with proper configuration
2. **Configure security rules** for your environment
3. **Prepare student data** in CSV format
4. **Test import process** with sample data
5. **Train staff** on admin interface usage
6. **Schedule regular updates** and maintenance

For additional support or customization requests, contact your development team.



