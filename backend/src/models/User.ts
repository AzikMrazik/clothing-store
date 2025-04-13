import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Определяем интерфейс для документа пользователя
interface IUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'user';
  lastLogin?: Date;
  lastIp?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Определяем интерфейс для модели пользователя (для статических методов, если понадобятся)
interface IUserModel extends Model<IUser> {
  // Здесь можно добавить статические методы, если нужно
}

const UserSchema = new mongoose.Schema<IUser, IUserModel>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Не возвращать пароль по умолчанию при запросах
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  lastLogin: {
    type: Date
  },
  lastIp: {
    type: String
  }
}, {
  timestamps: true
});

// Хеширование пароля перед сохранением
UserSchema.pre('save', async function(next) {
  // Хешируем пароль только если он был изменен (или новый)
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Метод для сравнения введенного пароля с хешированным
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  // `this` здесь будет IUser документом
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser, IUserModel>('User', UserSchema);