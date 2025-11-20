import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  where
} from 'firebase/firestore';
import { db, getStudentsCollection } from './firebase';

// Enhanced Student interface based on Excel report data
export interface Student {
  // Basic Info
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  homeroom: string;
  
  // Contact Info
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  
  // Academic Info
  gpa?: number;
  credits?: number;
  graduationYear?: string;
  
  // Behavior/Attendance
  pbisPoints: number;
  ttsCount: number; // Tardy to School
  ttcCount: number; // Tardy to Class
  absences: number;
  detentions: number;
  suspensions: number;
  
  // Schedule Info
  schedule?: Array<{
    period: string;
    course: string;
    room: string;
    teacher: string;
    days: string;
    credits: number;
  }>;
  
  // History/Notes
  notes?: string[];
  alerts?: Array<{
    type: string;
    level: 'warning' | 'info' | 'critical';
    text: string;
    date: string;
  }>;
  
  // Dates
  lastTardy?: string;
  lastAbsence?: string;
  enrollmentDate?: string;
  ruleTriggered?: string;
  
  // Legacy fields for compatibility
  photoUrl?: string;
  lastUpdated: string;
}

export interface RosterStats {
  totalStudents: number;
  byGrade: Record<string, number>;
  byHomeroom: Record<string, number>;
  averagePbisPoints: number;
  studentsWithAlerts: number;
}

// Student CRUD Operations
export const studentService = {
  // Get all students
  async getAllStudents(): Promise<Student[]> {
    try {
      const studentsCollection = collection(db, getStudentsCollection());
      const snapshot = await getDocs(studentsCollection);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  },

  // Get student by ID
  async getStudentById(id: string): Promise<Student | null> {
    try {
      const studentDoc = doc(db, getStudentsCollection(), id);
      const snapshot = await getDocs(collection(db, getStudentsCollection()));
      const student = snapshot.docs.find(doc => doc.id === id);
      
      if (student) {
        const data = student.data();
        return {
          id: student.id,
          firstName: data.firstName,
          lastName: data.lastName,
          grade: data.grade,
          homeroom: data.homeroom,
          email: data.email,
          phone: data.phone,
          parentName: data.parentName,
          parentPhone: data.parentPhone,
          parentEmail: data.parentEmail,
          gpa: data.gpa,
          credits: data.credits,
          graduationYear: data.graduationYear,
          pbisPoints: data.pbisPoints || 0,
          ttsCount: data.ttsCount || 0,
          ttcCount: data.ttcCount || 0,
          absences: data.absences || 0,
          detentions: data.detentions || 0,
          suspensions: data.suspensions || 0,
          schedule: data.schedule || [],
          notes: data.notes || [],
          alerts: data.alerts || [],
          lastTardy: data.lastTardy,
          lastAbsence: data.lastAbsence,
          enrollmentDate: data.enrollmentDate,
          ruleTriggered: data.ruleTriggered,
          photoUrl: data.photoUrl,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        } as Student;
      }
      return null;
    } catch (error) {
      console.error('Error fetching student:', error);
      throw error;
    }
  },

  // Add single student
  async addStudent(student: Omit<Student, 'lastUpdated'>): Promise<void> {
    try {
      const studentDoc = doc(db, getStudentsCollection(), student.id);
      await setDoc(studentDoc, {
        ...student,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  },

  // Update student
  async updateStudent(id: string, updates: Partial<Student>): Promise<void> {
    try {
      const studentDoc = doc(db, getStudentsCollection(), id);
      await setDoc(studentDoc, {
        ...updates,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  // Delete student
  async deleteStudent(id: string): Promise<void> {
    try {
      const studentDoc = doc(db, getStudentsCollection(), id);
      await deleteDoc(studentDoc);
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // Bulk import students
  async bulkImportStudents(students: Omit<Student, 'lastUpdated'>[]): Promise<{
    success: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const batch = writeBatch(db);
    const errors: Array<{ id: string; error: string }> = [];
    let successCount = 0;

    try {
      for (const student of students) {
        try {
          const studentDoc = doc(db, getStudentsCollection(), student.id);
          batch.set(studentDoc, {
            ...student,
            lastUpdated: new Date().toISOString()
          });
          successCount++;
        } catch (error) {
          errors.push({
            id: student.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      await batch.commit();
      
      return { success: successCount, errors };
    } catch (error) {
      console.error('Error in bulk import:', error);
      throw error;
    }
  },

  // Search students
  async searchStudents(searchTerm: string): Promise<Student[]> {
    try {
      const studentsCollection = collection(db, getStudentsCollection());
      const snapshot = await getDocs(studentsCollection);
      
      const allStudents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];

      // Client-side filtering (Firestore doesn't support full-text search)
      return allStudents.filter(student => 
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.includes(searchTerm) ||
        student.homeroom.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching students:', error);
      throw error;
    }
  },

  // Get students by grade
  async getStudentsByGrade(grade: string): Promise<Student[]> {
    try {
      const studentsCollection = collection(db, getStudentsCollection());
      const q = query(studentsCollection, where('grade', '==', grade));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
    } catch (error) {
      console.error('Error fetching students by grade:', error);
      throw error;
    }
  },

  // Get students by homeroom
  async getStudentsByHomeroom(homeroom: string): Promise<Student[]> {
    try {
      const studentsCollection = collection(db, getStudentsCollection());
      const q = query(studentsCollection, where('homeroom', '==', homeroom));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
    } catch (error) {
      console.error('Error fetching students by homeroom:', error);
      throw error;
    }
  },

  // Get roster statistics
  async getRosterStats(): Promise<RosterStats> {
    try {
      const students = await this.getAllStudents();
      
      const stats: RosterStats = {
        totalStudents: students.length,
        byGrade: {},
        byHomeroom: {},
        averagePbisPoints: 0,
        studentsWithAlerts: 0
      };

      let totalPbisPoints = 0;

      students.forEach(student => {
        // Count by grade
        stats.byGrade[student.grade] = (stats.byGrade[student.grade] || 0) + 1;
        
        // Count by homeroom
        stats.byHomeroom[student.homeroom] = (stats.byHomeroom[student.homeroom] || 0) + 1;
        
        // Sum PBIS points
        totalPbisPoints += student.pbisPoints;
        
        // Count students with alerts
        if (student.alerts && student.alerts.length > 0) {
          stats.studentsWithAlerts++;
        }
      });

      stats.averagePbisPoints = students.length > 0 ? totalPbisPoints / students.length : 0;

      return stats;
    } catch (error) {
      console.error('Error getting roster stats:', error);
      throw error;
    }
  },

  // Export students to CSV
  exportToCSV(students: Student[]): string {
    const headers = [
      'id',
      'first_name',
      'last_name',
      'grade',
      'homeroom',
      'pbis_points',
      'email',
      'phone',
      'parent_name',
      'parent_phone',
      'parent_email',
      'photo_url',
      'tts_count',
      'ttc_count',
      'last_tardy',
      'rule_triggered'
    ];

    const csvRows = [headers.join(',')];

    students.forEach(student => {
      const row = [
        student.id,
        student.firstName,
        student.lastName,
        student.grade,
        student.homeroom,
        student.pbisPoints,
        student.email || '',
        student.phone || '',
        student.parentName || '',
        student.parentPhone || '',
        student.parentEmail || '',
        student.photoUrl || '',
        student.ttsCount,
        student.ttcCount,
        student.lastTardy || '',
        student.ruleTriggered || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
};

// Validation utilities
export const studentValidation = {
  validateStudentId(id: string): boolean {
    return /^\d{10}$/.test(id);
  },

  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  validatePhone(phone: string): boolean {
    return /^[\d\s\-\(\)\+]+$/.test(phone);
  },

  validateStudent(student: Partial<Student>): string[] {
    const errors: string[] = [];

    if (!student.id || !this.validateStudentId(student.id)) {
      errors.push('Student ID must be exactly 10 digits');
    }

    if (!student.firstName || student.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!student.lastName || student.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!student.grade || student.grade.trim().length === 0) {
      errors.push('Grade is required');
    }

    if (!student.homeroom || student.homeroom.trim().length === 0) {
      errors.push('Homeroom is required');
    }

    if (student.email && !this.validateEmail(student.email)) {
      errors.push('Invalid email format');
    }

    if (student.phone && !this.validatePhone(student.phone)) {
      errors.push('Invalid phone format');
    }

    if (student.parentEmail && !this.validateEmail(student.parentEmail)) {
      errors.push('Invalid parent email format');
    }

    if (student.parentPhone && !this.validatePhone(student.parentPhone)) {
      errors.push('Invalid parent phone format');
    }

    return errors;
  }
};
