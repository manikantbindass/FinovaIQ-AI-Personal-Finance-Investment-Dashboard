import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { AuthedRequest, SessionGuard } from "./auth";
import { Db } from "./db";
import { FinanceService } from "./finance.service";
import { currentMonth } from "./finance";
@ApiTags("Finance")
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class FinanceController {
  constructor(
    @Inject(FinanceService) private readonly finance: FinanceService,
    @Inject(Db) private readonly db: Db,
  ) {}
  @Get("categories") categories() {
    return this.db.category.findMany({ orderBy: { name: "asc" } });
  }
  @Get("accounts") accounts(@Req() r: AuthedRequest) {
    return this.finance.accounts(r.userId);
  }
  @Post("accounts") createAccount(@Req() r: AuthedRequest, @Body() b: unknown) {
    return this.finance.createAccount(r.userId, b);
  }
  @Get("transactions") transactions(
    @Req() r: AuthedRequest,
    @Query() q: unknown,
  ) {
    return this.finance.transactions(r.userId, q);
  }
  @Post("transactions") createTransaction(
    @Req() r: AuthedRequest,
    @Body() b: unknown,
  ) {
    return this.finance.createTransaction(r.userId, b);
  }
  @Patch("transactions/:id") updateTransaction(
    @Req() r: AuthedRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.finance.updateTransaction(r.userId, id, b);
  }
  @Delete("transactions/:id") deleteTransaction(
    @Req() r: AuthedRequest,
    @Param("id") id: string,
  ) {
    return this.finance.deleteTransaction(r.userId, id);
  }
  @Post("transactions/import") import(
    @Req() r: AuthedRequest,
    @Body() b: unknown,
  ) {
    return this.finance.importCsv(r.userId, b);
  }
  @Post("transfers") transfer(@Req() r: AuthedRequest, @Body() b: unknown) {
    return this.finance.transfer(r.userId, b);
  }
  @Get("budgets") budgets(
    @Req() r: AuthedRequest,
    @Query("month") m = currentMonth(),
  ) {
    return this.finance.budgets(r.userId, m);
  }
  @Post("budgets") budget(@Req() r: AuthedRequest, @Body() b: unknown) {
    return this.finance.saveBudget(r.userId, b);
  }
  @Get("goals") goals(@Req() r: AuthedRequest) {
    return this.finance.goals(r.userId);
  }
  @Post("goals") goal(@Req() r: AuthedRequest, @Body() b: unknown) {
    return this.finance.saveGoal(r.userId, b);
  }
  @Patch("goals/:id") updateGoal(
    @Req() r: AuthedRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.finance.saveGoal(r.userId, b, id);
  }
  @Get("portfolios") portfolios(@Req() r: AuthedRequest) {
    return this.finance.portfolios(r.userId);
  }
  @Post("portfolios") portfolio(@Req() r: AuthedRequest, @Body() b: unknown) {
    return this.finance.createPortfolio(r.userId, b);
  }
  @Post("portfolios/:id/trades") trade(
    @Req() r: AuthedRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.finance.trade(r.userId, id, b);
  }
  @Get("analytics/dashboard") dashboard(
    @Req() r: AuthedRequest,
    @Query("month") m = currentMonth(),
  ) {
    return this.finance.dashboard(r.userId, m);
  }
  @Post("analytics/forecast") forecast(
    @Req() r: AuthedRequest,
    @Body() b: unknown,
  ) {
    return this.finance.forecast(r.userId, b);
  }
}
