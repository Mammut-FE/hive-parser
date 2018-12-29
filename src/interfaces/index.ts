import { IParseDrop } from './parseDrop.interface';
import { IParseExpr } from './parseExpr.interface';
import { IParseSelect } from './parseSelect.interface';
import { IParseUse } from './parseUse.interface';

export interface Parser extends IParseSelect, IParseExpr, IParseUse, IParseDrop {

}
