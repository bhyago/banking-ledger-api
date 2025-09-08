import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDTO {
  @ApiProperty({ example: 'AccountNotFoundError' })
  name!: string;

  @ApiProperty({ example: 'Account not found' })
  message!: string;
}
