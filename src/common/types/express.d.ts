import { JwtAccessPayload } from './token.types';
import { IUser } from '../../modules/users/user.model';
import { ISession } from '../../modules/sessions/session.model';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      tokenPayload?: JwtAccessPayload;
      session?: ISession;
    }
  }
}
