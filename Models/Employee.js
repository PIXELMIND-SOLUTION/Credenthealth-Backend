import mongoose from 'mongoose';

const { Schema } = mongoose;

const employeeSchema = new Schema({
    name: { type: String, },
    email: { type: String, unique: true },
    password: { type: String, },
    mobile: { type: String,},
    address: { type: String, },  // Frontend will send "location", but DB will use "address"
    gender: { type: String, enum: ['Male', 'Female', 'Other'], },
    designation: { type: String, },
    department: { type: String,},
    employeeId: { type: String, unique: true,},
    pagesAccess: { type: [String],},
    grade: { type: Number, enum: [1, 2, 3, 4, 5], },
    role: { type: String, default: 'Employee' }  // Default role is "Employee"
}, {
    timestamps: true
});

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
