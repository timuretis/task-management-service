import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

// Trim before validating so a title of only spaces counts as empty.
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// A description of only spaces is the same as none, so it is not stored as an empty string.
const blankToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

/** Only these fields are accepted; id, status and createdAt are set by the server. */
export class CreateTaskDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  // ValidateIf (not IsOptional) so an explicit null is rejected; only a missing field is allowed.
  @ValidateIf((_, value) => value !== undefined)
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(2000)
  description?: string;
}
