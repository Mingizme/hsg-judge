// ============================================
// Submission DTOs
// Validation cho API submit code & run custom
// ============================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

// ── Submit Code (Full Judge) ──────────────────

export class SubmitCodeDto {
  @IsString()
  @IsNotEmpty()
  problemCode: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Source code quá ngắn' })
  @MaxLength(100000, { message: 'Source code quá dài (max 100KB)' })
  sourceCode: string;

  @IsString()
  @IsOptional()
  language?: string = 'cpp';
}

// ── Run Custom Input ──────────────────────────

export class RunCustomDto {
  @IsString()
  @IsNotEmpty()
  problemCode: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(100000)
  sourceCode: string;

  @IsString()
  customInput: string;

  @IsString()
  @IsOptional()
  language?: string = 'cpp';
}
