import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty()
  username!: string; //! tells TypeScript “trust me, this will be assigned by the framework before it’s used”.

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  password!: string;
  name: any;
}
