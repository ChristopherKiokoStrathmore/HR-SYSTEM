#  Django REST Framework Payroll API Implementation

  Project Context

  You are building a multi-tenant HR/Payroll system for Kenyan businesses. The system handles:
  - Employee salary management
  - Kenyan statutory deductions (PAYE, NSSF, NHIF, Housing Levy, HELB)
  - Multiple payment methods: Bank EFT, M-Pesa, Airtel Money
  - Payment processing via PesaPal integration
  - Multi-tenant architecture with tenant isolation

  Database Models to Create

  # models.py

  from django.db import models
  from django.contrib.auth import get_user_model
  import uuid

  User = get_user_model()

  class Company(models.Model):
      """Tenant/Company model"""
      id = models.UUIDField(primary_key=True, default=uuid.uuid4)
      tenant_id = models.UUIDField(db_index=True)
      name = models.CharField(max_length=255)

      # Company payment accounts
      company_bank_name = models.CharField(max_length=100, null=True, blank=True)
      company_bank_account = models.CharField(max_length=50, null=True, blank=True)
      company_bank_branch = models.CharField(max_length=100, null=True, blank=True)
      mpesa_paybill_number = models.CharField(max_length=20, null=True, blank=True)
      mpesa_till_number = models.CharField(max_length=20, null=True, blank=True)

      # PesaPal integration
      pesapal_consumer_key = models.CharField(max_length=255, null=True, blank=True)
      pesapal_consumer_secret = models.CharField(max_length=255, null=True, blank=True)
      pesapal_ipn_id = models.CharField(max_length=100, null=True, blank=True)

      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)


  class Employee(models.Model):
      """Employee model with payment preferences"""
      PAYMENT_METHODS = [
          ('bank', 'Bank Transfer'),
          ('mpesa', 'M-Pesa'),
          ('airtel', 'Airtel Money'),
      ]

      id = models.UUIDField(primary_key=True, default=uuid.uuid4)
      tenant_id = models.UUIDField(db_index=True)
      company = models.ForeignKey(Company, on_delete=models.CASCADE)
      user = models.OneToOneField(User, on_delete=models.CASCADE)
      employee_number = models.CharField(max_length=50)

      # Salary
      salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)

      # Payment method preferences
      payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, default='bank')
      bank_name = models.CharField(max_length=100, null=True, blank=True)
      bank_account = models.CharField(max_length=50, null=True, blank=True)
      bank_branch = models.CharField(max_length=100, null=True, blank=True)
      mpesa_number = models.CharField(max_length=15, null=True, blank=True)
      airtel_number = models.CharField(max_length=15, null=True, blank=True)

      # Statutory numbers
      nssf_number = models.CharField(max_length=50, null=True, blank=True)
      nhif_number = models.CharField(max_length=50, null=True, blank=True)
      kra_pin = models.CharField(max_length=20, null=True, blank=True)
      helb_number = models.CharField(max_length=50, null=True, blank=True)
      helb_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)

      # Employment details
      start_date = models.DateField()
      end_date = models.DateField(null=True, blank=True)
      status = models.CharField(max_length=20, default='active')

      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)
      is_deleted = models.BooleanField(default=False)


  class PayrollRun(models.Model):
      """Monthly payroll run"""
      STATUS_CHOICES = [
          ('draft', 'Draft'),
          ('calculated', 'Calculated'),
          ('approved', 'Approved'),
          ('processing', 'Processing'),
          ('completed', 'Completed'),
          ('failed', 'Failed'),
      ]

      id = models.UUIDField(primary_key=True, default=uuid.uuid4)
      tenant_id = models.UUIDField(db_index=True)
      company = models.ForeignKey(Company, on_delete=models.CASCADE)

      period_start = models.DateField()
      period_end = models.DateField()
      pay_date = models.DateField()

      status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

      # Totals (calculated)
      total_gross = models.DecimalField(max_digits=14, decimal_places=2, default=0)
      total_net = models.DecimalField(max_digits=14, decimal_places=2, default=0)
      total_paye = models.DecimalField(max_digits=14, decimal_places=2, default=0)
      total_nssf = models.DecimalField(max_digits=14, decimal_places=2, default=0)
      total_nhif = models.DecimalField(max_digits=14, decimal_places=2, default=0)
      total_housing_levy = models.DecimalField(max_digits=14, decimal_places=2, default=0)
      total_helb = models.DecimalField(max_digits=14, decimal_places=2, default=0)
      employee_count = models.IntegerField(default=0)

      # Workflow
      created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_payroll_runs')
      approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_payroll_runs')
      approved_at = models.DateTimeField(null=True, blank=True)

      notes = models.TextField(null=True, blank=True)

      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)
      is_deleted = models.BooleanField(default=False)

      class Meta:
          ordering = ['-period_start']
          unique_together = ['tenant_id', 'company', 'period_start', 'period_end']


  class PayrollRecord(models.Model):
      """Individual employee payroll record within a run"""
      PAYMENT_STATUS = [
          ('pending', 'Pending'),
          ('processing', 'Processing'),
          ('paid', 'Paid'),
          ('failed', 'Failed'),
      ]

      id = models.UUIDField(primary_key=True, default=uuid.uuid4)
      tenant_id = models.UUIDField(db_index=True)
      payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name='records')
      employee = models.ForeignKey(Employee, on_delete=models.CASCADE)

      # Earnings
      basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
      allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
      overtime = models.DecimalField(max_digits=12, decimal_places=2, default=0)
      bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
      gross_pay = models.DecimalField(max_digits=12, decimal_places=2)

      # Statutory deductions (Kenya)
      nssf_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
      nssf_employer = models.DecimalField(max_digits=10, decimal_places=2, default=0)
      nhif = models.DecimalField(max_digits=10, decimal_places=2, default=0)
      paye = models.DecimalField(max_digits=12, decimal_places=2, default=0)
      housing_levy_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
      housing_levy_employer = models.DecimalField(max_digits=10, decimal_places=2, default=0)
      helb = models.DecimalField(max_digits=10, decimal_places=2, default=0)

      # Other deductions
      other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
      total_deductions = models.DecimalField(max_digits=12, decimal_places=2)

      # Net
      net_pay = models.DecimalField(max_digits=12, decimal_places=2)

      # Payment tracking
      payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
      payment_method = models.CharField(max_length=10)
      payment_reference = models.CharField(max_length=100, null=True, blank=True)
      payment_date = models.DateTimeField(null=True, blank=True)
      payment_error = models.TextField(null=True, blank=True)

      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)


  class PaymentBatch(models.Model):
      """Batch of payments for bulk processing"""
      STATUS_CHOICES = [
          ('pending', 'Pending'),
          ('processing', 'Processing'),
          ('completed', 'Completed'),
          ('partial', 'Partial'),
          ('failed', 'Failed'),
      ]

      id = models.UUIDField(primary_key=True, default=uuid.uuid4)
      tenant_id = models.UUIDField(db_index=True)
      payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name='payment_batches')

      payment_method = models.CharField(max_length=10)  # bank, mpesa, airtel
      status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

      total_amount = models.DecimalField(max_digits=14, decimal_places=2)
      successful_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
      failed_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

      record_count = models.IntegerField(default=0)
      successful_count = models.IntegerField(default=0)
      failed_count = models.IntegerField(default=0)

      # PesaPal tracking
      pesapal_order_tracking_id = models.CharField(max_length=100, null=True, blank=True)
      pesapal_merchant_reference = models.CharField(max_length=100, null=True, blank=True)

      started_at = models.DateTimeField(null=True, blank=True)
      completed_at = models.DateTimeField(null=True, blank=True)

      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)

  Kenyan Tax Calculation Service

  # services/tax_calculator.py

  from decimal import Decimal, ROUND_HALF_UP
  from typing import Dict
  from datetime import date

  class KenyanTaxCalculator:
      """
      Kenya statutory deductions calculator (2024 rates)
      """

      # PAYE Tax Bands (Monthly)
      PAYE_BANDS = [
          (Decimal('24000'), Decimal('0.10')),
          (Decimal('8333'), Decimal('0.25')),
          (Decimal('467667'), Decimal('0.30')),
          (Decimal('300000'), Decimal('0.325')),
          (None, Decimal('0.35')),  # Above 800,000
      ]

      PERSONAL_RELIEF = Decimal('2400')  # Monthly

      # NSSF (Tier I & II combined)
      NSSF_RATE = Decimal('0.06')
      NSSF_UPPER_LIMIT = Decimal('18000')  # Max pensionable earnings

      # NHIF Bands
      NHIF_BANDS = [
          (Decimal('5999'), Decimal('150')),
          (Decimal('7999'), Decimal('300')),
          (Decimal('11999'), Decimal('400')),
          (Decimal('14999'), Decimal('500')),
          (Decimal('19999'), Decimal('600')),
          (Decimal('24999'), Decimal('750')),
          (Decimal('29999'), Decimal('850')),
          (Decimal('34999'), Decimal('900')),
          (Decimal('39999'), Decimal('950')),
          (Decimal('44999'), Decimal('1000')),
          (Decimal('49999'), Decimal('1100')),
          (Decimal('59999'), Decimal('1200')),
          (Decimal('69999'), Decimal('1300')),
          (Decimal('79999'), Decimal('1400')),
          (Decimal('89999'), Decimal('1500')),
          (Decimal('99999'), Decimal('1600')),
          (None, Decimal('1700')),  # 100,000+
      ]

      # Housing Levy
      HOUSING_LEVY_RATE = Decimal('0.015')  # 1.5% each for employee and employer

      def calculate_nssf(self, gross_pay: Decimal) -> Dict[str, Decimal]:
          """Calculate NSSF contributions (employee & employer)"""
          pensionable = min(gross_pay, self.NSSF_UPPER_LIMIT)
          contribution = (pensionable * self.NSSF_RATE).quantize(Decimal('0.01'), ROUND_HALF_UP)
          return {
              'employee': contribution,
              'employer': contribution
          }

      def calculate_nhif(self, gross_pay: Decimal) -> Decimal:
          """Calculate NHIF contribution based on salary band"""
          for upper_limit, amount in self.NHIF_BANDS:
              if upper_limit is None or gross_pay <= upper_limit:
                  return amount
          return self.NHIF_BANDS[-1][1]

      def calculate_housing_levy(self, gross_pay: Decimal) -> Dict[str, Decimal]:
          """Calculate Housing Levy (1.5% each)"""
          levy = (gross_pay * self.HOUSING_LEVY_RATE).quantize(Decimal('0.01'), ROUND_HALF_UP)
          return {
              'employee': levy,
              'employer': levy
          }

      def calculate_paye(self, gross_pay: Decimal, nssf_employee: Decimal, 
                         nhif: Decimal, housing_levy: Decimal) -> Decimal:
          """
          Calculate PAYE using graduated tax bands
          Taxable income = Gross - NSSF - NHIF - Housing Levy
          """
          taxable_income = gross_pay - nssf_employee - nhif - housing_levy

          if taxable_income <= 0:
              return Decimal('0')

          tax = Decimal('0')
          remaining = taxable_income

          for band_amount, rate in self.PAYE_BANDS:
              if band_amount is None:
                  # Top bracket - tax remaining at this rate
                  tax += remaining * rate
                  break

              if remaining <= band_amount:
                  tax += remaining * rate
                  break
              else:
                  tax += band_amount * rate
                  remaining -= band_amount

          # Apply personal relief
          tax = max(Decimal('0'), tax - self.PERSONAL_RELIEF)

          return tax.quantize(Decimal('0.01'), ROUND_HALF_UP)

      def calculate_all(self, gross_pay: Decimal, helb_deduction: Decimal = Decimal('0')) -> Dict:
          """Calculate all statutory deductions for an employee"""
          gross = Decimal(str(gross_pay))

          nssf = self.calculate_nssf(gross)
          nhif = self.calculate_nhif(gross)
          housing_levy = self.calculate_housing_levy(gross)
          paye = self.calculate_paye(gross, nssf['employee'], nhif, housing_levy['employee'])

          total_deductions = (
              nssf['employee'] + nhif + housing_levy['employee'] + paye + helb_deduction
          )

          net_pay = gross - total_deductions

          return {
              'gross_pay': gross,
              'nssf_employee': nssf['employee'],
              'nssf_employer': nssf['employer'],
              'nhif': nhif,
              'housing_levy_employee': housing_levy['employee'],
              'housing_levy_employer': housing_levy['employer'],
              'paye': paye,
              'helb': helb_deduction,
              'total_deductions': total_deductions,
              'net_pay': net_pay,
          }

  API Serializers

  # serializers.py

  from rest_framework import serializers
  from .models import PayrollRun, PayrollRecord, PaymentBatch, Employee, Company

  class EmployeePaymentSerializer(serializers.ModelSerializer):
      """Serializer for employee payment method updates"""
      class Meta:
          model = Employee
          fields = [
              'payment_method', 'bank_name', 'bank_account', 'bank_branch',
              'mpesa_number', 'airtel_number'
          ]

      def validate(self, data):
          method = data.get('payment_method')
          if method == 'bank':
              if not data.get('bank_name') or not data.get('bank_account'):
                  raise serializers.ValidationError(
                      "Bank name and account number required for bank payment"
                  )
          elif method == 'mpesa':
              if not data.get('mpesa_number'):
                  raise serializers.ValidationError(
                      "M-Pesa number required for M-Pesa payment"
                  )
          elif method == 'airtel':
              if not data.get('airtel_number'):
                  raise serializers.ValidationError(
                      "Airtel number required for Airtel Money payment"
                  )
          return data


  class CompanyPaymentConfigSerializer(serializers.ModelSerializer):
      """Serializer for company payment configuration"""
      class Meta:
          model = Company
          fields = [
              'company_bank_name', 'company_bank_account', 'company_bank_branch',
              'mpesa_paybill_number', 'mpesa_till_number',
              'pesapal_consumer_key', 'pesapal_consumer_secret', 'pesapal_ipn_id'
          ]


  class PayrollRecordSerializer(serializers.ModelSerializer):
      employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
      employee_number = serializers.CharField(source='employee.employee_number', read_only=True)

      class Meta:
          model = PayrollRecord
          fields = [
              'id', 'employee', 'employee_name', 'employee_number',
              'basic_salary', 'allowances', 'overtime', 'bonus', 'gross_pay',
              'nssf_employee', 'nssf_employer', 'nhif', 'paye',
              'housing_levy_employee', 'housing_levy_employer', 'helb',
              'other_deductions', 'total_deductions', 'net_pay',
              'payment_status', 'payment_method', 'payment_reference', 'payment_date'
          ]
          read_only_fields = ['id', 'employee_name', 'employee_number']


  class PayrollRunListSerializer(serializers.ModelSerializer):
      """List view serializer with summary info"""
      class Meta:
          model = PayrollRun
          fields = [
              'id', 'period_start', 'period_end', 'pay_date', 'status',
              'total_gross', 'total_net', 'employee_count',
              'created_at', 'approved_at'
          ]


  class PayrollRunDetailSerializer(serializers.ModelSerializer):
      """Detail view serializer with full breakdown"""
      records = PayrollRecordSerializer(many=True, read_only=True)
      created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
      approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

      class Meta:
          model = PayrollRun
          fields = [
              'id', 'period_start', 'period_end', 'pay_date', 'status',
              'total_gross', 'total_net', 'total_paye', 'total_nssf',
              'total_nhif', 'total_housing_levy', 'total_helb',
              'employee_count', 'notes',
              'created_by', 'created_by_name', 'created_at',
              'approved_by', 'approved_by_name', 'approved_at',
              'records'
          ]
          read_only_fields = ['id', 'created_by', 'created_at']


  class PayrollRunCreateSerializer(serializers.ModelSerializer):
      """Create a new payroll run"""
      class Meta:
          model = PayrollRun
          fields = ['period_start', 'period_end', 'pay_date', 'notes']

      def validate(self, data):
          # Check for overlapping payroll runs
          tenant_id = self.context['request'].user.tenant_id
          company_id = self.context['company_id']

          overlapping = PayrollRun.objects.filter(
              tenant_id=tenant_id,
              company_id=company_id,
              is_deleted=False,
              period_start__lte=data['period_end'],
              period_end__gte=data['period_start']
          ).exists()

          if overlapping:
              raise serializers.ValidationError(
                  "A payroll run already exists for this period"
              )

          return data


  class PaymentBatchSerializer(serializers.ModelSerializer):
      class Meta:
          model = PaymentBatch
          fields = [
              'id', 'payment_method', 'status',
              'total_amount', 'successful_amount', 'failed_amount',
              'record_count', 'successful_count', 'failed_count',
              'started_at', 'completed_at'
          ]


  class DisbursePayrollSerializer(serializers.Serializer):
      """Trigger payroll disbursement"""
      record_ids = serializers.ListField(
          child=serializers.UUIDField(),
          required=False,
          help_text="Specific record IDs to pay. If empty, pays all pending records."
      )
      payment_methods = serializers.ListField(
          child=serializers.ChoiceField(choices=['bank', 'mpesa', 'airtel']),
          required=False,
          help_text="Filter by payment methods. If empty, processes all methods."
      )

  API ViewSets

  # views.py

  from rest_framework import viewsets, status
  from rest_framework.decorators import action
  from rest_framework.response import Response
  from rest_framework.permissions import IsAuthenticated
  from django.db import transaction
  from django.utils import timezone
  from decimal import Decimal

  from .models import PayrollRun, PayrollRecord, PaymentBatch, Employee
  from .serializers import (
      PayrollRunListSerializer, PayrollRunDetailSerializer,
      PayrollRunCreateSerializer, PayrollRecordSerializer,
      DisbursePayrollSerializer, PaymentBatchSerializer,
      EmployeePaymentSerializer
  )
  from .services.tax_calculator import KenyanTaxCalculator
  from .tasks import process_payment_batch


  class PayrollRunViewSet(viewsets.ModelViewSet):
      """
      Payroll Run management endpoints
      
      Workflow: draft → calculated → approved → processing → completed
      """
      permission_classes = [IsAuthenticated]

      def get_queryset(self):
          return PayrollRun.objects.filter(
              tenant_id=self.request.user.tenant_id,
              is_deleted=False
          ).select_related('created_by', 'approved_by')

      def get_serializer_class(self):
          if self.action == 'list':
              return PayrollRunListSerializer
          if self.action == 'create':
              return PayrollRunCreateSerializer
          return PayrollRunDetailSerializer

      def perform_create(self, serializer):
          serializer.save(
              tenant_id=self.request.user.tenant_id,
              company_id=self.request.user.company_id,
              created_by=self.request.user,
              status='draft'
          )

      @action(detail=True, methods=['post'])
      def calculate(self, request, pk=None):
          """
          Calculate payroll for all active employees
          Generates PayrollRecord for each employee with tax calculations
          """
          payroll_run = self.get_object()

          if payroll_run.status != 'draft':
              return Response(
                  {'error': 'Can only calculate draft payroll runs'},
                  status=status.HTTP_400_BAD_REQUEST
              )

          # Get active employees
          employees = Employee.objects.filter(
              tenant_id=request.user.tenant_id,
              company_id=payroll_run.company_id,
              status='active',
              is_deleted=False
          )

          calculator = KenyanTaxCalculator()

          with transaction.atomic():
              # Clear existing records
              PayrollRecord.objects.filter(payroll_run=payroll_run).delete()

              records = []
              totals = {
                  'gross': Decimal('0'),
                  'net': Decimal('0'),
                  'paye': Decimal('0'),
                  'nssf': Decimal('0'),
                  'nhif': Decimal('0'),
                  'housing_levy': Decimal('0'),
                  'helb': Decimal('0'),
              }

              for employee in employees:
                  # Calculate deductions
                  calcs = calculator.calculate_all(
                      gross_pay=employee.salary,
                      helb_deduction=employee.helb_deduction or Decimal('0')
                  )

                  record = PayrollRecord(
                      tenant_id=request.user.tenant_id,
                      payroll_run=payroll_run,
                      employee=employee,
                      basic_salary=employee.salary,
                      gross_pay=calcs['gross_pay'],
                      nssf_employee=calcs['nssf_employee'],
                      nssf_employer=calcs['nssf_employer'],
                      nhif=calcs['nhif'],
                      paye=calcs['paye'],
                      housing_levy_employee=calcs['housing_levy_employee'],
                      housing_levy_employer=calcs['housing_levy_employer'],
                      helb=calcs['helb'],
                      total_deductions=calcs['total_deductions'],
                      net_pay=calcs['net_pay'],
                      payment_method=employee.payment_method,
                      payment_status='pending'
                  )
                  records.append(record)

                  # Update totals
                  totals['gross'] += calcs['gross_pay']
                  totals['net'] += calcs['net_pay']
                  totals['paye'] += calcs['paye']
                  totals['nssf'] += calcs['nssf_employee']
                  totals['nhif'] += calcs['nhif']
                  totals['housing_levy'] += calcs['housing_levy_employee']
                  totals['helb'] += calcs['helb']

              PayrollRecord.objects.bulk_create(records)

              # Update payroll run
              payroll_run.status = 'calculated'
              payroll_run.employee_count = len(records)
              payroll_run.total_gross = totals['gross']
              payroll_run.total_net = totals['net']
              payroll_run.total_paye = totals['paye']
              payroll_run.total_nssf = totals['nssf']
              payroll_run.total_nhif = totals['nhif']
              payroll_run.total_housing_levy = totals['housing_levy']
              payroll_run.total_helb = totals['helb']
              payroll_run.save()

          return Response(PayrollRunDetailSerializer(payroll_run).data)

      @action(detail=True, methods=['post'])
      def approve(self, request, pk=None):
          """Approve payroll run for disbursement"""
          payroll_run = self.get_object()

          if payroll_run.status != 'calculated':
              return Response(
                  {'error': 'Can only approve calculated payroll runs'},
                  status=status.HTTP_400_BAD_REQUEST
              )

          payroll_run.status = 'approved'
          payroll_run.approved_by = request.user
          payroll_run.approved_at = timezone.now()
          payroll_run.save()

          return Response(PayrollRunDetailSerializer(payroll_run).data)

      @action(detail=True, methods=['post'])
      def disburse(self, request, pk=None):
          """
          Trigger salary disbursement
          Creates payment batches and queues for async processing
          """
          payroll_run = self.get_object()

          if payroll_run.status not in ['approved', 'processing']:
              return Response(
                  {'error': 'Payroll must be approved before disbursement'},
                  status=status.HTTP_400_BAD_REQUEST
              )

          serializer = DisbursePayrollSerializer(data=request.data)
          serializer.is_valid(raise_exception=True)

          # Get pending records
          records = payroll_run.records.filter(payment_status='pending')

          if serializer.validated_data.get('record_ids'):
              records = records.filter(id__in=serializer.validated_data['record_ids'])

          if serializer.validated_data.get('payment_methods'):
              records = records.filter(
                  payment_method__in=serializer.validated_data['payment_methods']
              )

          if not records.exists():
              return Response(
                  {'error': 'No pending payments found'},
                  status=status.HTTP_400_BAD_REQUEST
              )

          # Group by payment method and create batches
          batches = []
          for method in ['bank', 'mpesa', 'airtel']:
              method_records = records.filter(payment_method=method)
              if method_records.exists():
                  batch = PaymentBatch.objects.create(
                      tenant_id=request.user.tenant_id,
                      payroll_run=payroll_run,
                      payment_method=method,
                      total_amount=sum(r.net_pay for r in method_records),
                      record_count=method_records.count(),
                      status='pending'
                  )
                  batches.append(batch)

                  # Queue async processing
                  process_payment_batch.delay(str(batch.id))

          # Update payroll run status
          payroll_run.status = 'processing'
          payroll_run.save()

          return Response({
              'message': f'Disbursement started for {records.count()} payments',
              'batches': PaymentBatchSerializer(batches, many=True).data
          })

      @action(detail=True, methods=['get'])
      def payment_status(self, request, pk=None):
          """Get current payment status for all batches"""
          payroll_run = self.get_object()
          batches = payroll_run.payment_batches.all()

          summary = {
              'total_records': payroll_run.employee_count,
              'pending': payroll_run.records.filter(payment_status='pending').count(),
              'processing': payroll_run.records.filter(payment_status='processing').count(),
              'paid': payroll_run.records.filter(payment_status='paid').count(),
              'failed': payroll_run.records.filter(payment_status='failed').count(),
          }

          return Response({
              'summary': summary,
              'batches': PaymentBatchSerializer(batches, many=True).data
          })

      @action(detail=True, methods=['post'])
      def retry_failed(self, request, pk=None):
          """Retry failed payments"""
          payroll_run = self.get_object()

          failed_records = payroll_run.records.filter(payment_status='failed')

          if not failed_records.exists():
              return Response({'message': 'No failed payments to retry'})

          # Reset to pending
          failed_records.update(
              payment_status='pending',
              payment_error=None
          )

          # Re-trigger disbursement for these records
          return self.disburse(request, pk)


  class EmployeePaymentViewSet(viewsets.GenericViewSet):
      """Employee payment method management"""
      permission_classes = [IsAuthenticated]
      serializer_class = EmployeePaymentSerializer

      def get_queryset(self):
          return Employee.objects.filter(
              tenant_id=self.request.user.tenant_id,
              is_deleted=False
          )

      @action(detail=True, methods=['put', 'patch'])
      def payment_method(self, request, pk=None):
          """Update employee payment method"""
          employee = self.get_object()
          serializer = self.get_serializer(employee, data=request.data, partial=True)
          serializer.is_valid(raise_exception=True)
          serializer.save()
          return Response(serializer.data)

  Celery Tasks for Payment Processing

  # tasks.py

  from celery import shared_task
  from django.utils import timezone
  import logging

  from .models import PaymentBatch, PayrollRecord, PayrollRun
  from .services.pesapal import PesaPalService

  logger = logging.getLogger(__name__)


  @shared_task(bind=True, max_retries=3)
  def process_payment_batch(self, batch_id: str):
      """
      Process a payment batch asynchronously
      Handles Bank, M-Pesa, and Airtel Money payments via PesaPal
      """
      try:
          batch = PaymentBatch.objects.select_related('payroll_run__company').get(id=batch_id)
      except PaymentBatch.DoesNotExist:
          logger.error(f"Payment batch {batch_id} not found")
          return

      batch.status = 'processing'
      batch.started_at = timezone.now()
      batch.save()

      # Get company PesaPal credentials
      company = batch.payroll_run.company
      pesapal = PesaPalService(
          consumer_key=company.pesapal_consumer_key,
          consumer_secret=company.pesapal_consumer_secret,
          ipn_id=company.pesapal_ipn_id
      )

      # Get pending records for this batch
      records = PayrollRecord.objects.filter(
          payroll_run=batch.payroll_run,
          payment_method=batch.payment_method,
          payment_status='pending'
      )

      successful = 0
      failed = 0
      successful_amount = 0
      failed_amount = 0

      for record in records:
          record.payment_status = 'processing'
          record.save()

          try:
              # Build payment request based on method
              if batch.payment_method == 'mpesa':
                  result = pesapal.send_mpesa(
                      phone=record.employee.mpesa_number,
                      amount=float(record.net_pay),
                      reference=f"SAL-{record.id}"
                  )
              elif batch.payment_method == 'airtel':
                  result = pesapal.send_airtel(
                      phone=record.employee.airtel_number,
                      amount=float(record.net_pay),
                      reference=f"SAL-{record.id}"
                  )
              else:  # bank
                  result = pesapal.send_bank_eft(
                      bank_name=record.employee.bank_name,
                      account_number=record.employee.bank_account,
                      amount=float(record.net_pay),
                      reference=f"SAL-{record.id}"
                  )

              if result['success']:
                  record.payment_status = 'paid'
                  record.payment_reference = result.get('reference')
                  record.payment_date = timezone.now()
                  successful += 1
                  successful_amount += float(record.net_pay)
              else:
                  record.payment_status = 'failed'
                  record.payment_error = result.get('error', 'Unknown error')
                  failed += 1
                  failed_amount += float(record.net_pay)

          except Exception as e:
              logger.exception(f"Payment failed for record {record.id}")
              record.payment_status = 'failed'
              record.payment_error = str(e)
              failed += 1
              failed_amount += float(record.net_pay)

          record.save()

      # Update batch summary
      batch.successful_count = successful
      batch.failed_count = failed
      batch.successful_amount = successful_amount
      batch.failed_amount = failed_amount
      batch.completed_at = timezone.now()

      if failed == 0:
          batch.status = 'completed'
      elif successful == 0:
          batch.status = 'failed'
      else:
          batch.status = 'partial'

      batch.save()

      ### Check if all batches are complete and update payroll run
      check_payroll_completion.delay(str(batch.payroll_run_id))


  @shared_task
  def check_payroll_completion(payroll_run_id: str):
      """Check if all payments are complete and update payroll run status"""
      try:
          payroll_run = PayrollRun.objects.get(id=payroll_run_id)
      except PayrollRun.DoesNotExist:
          return

      pending = payroll_run.records.filter(payment_status__in=['pending', 'processing']).count()

      if pending == 0:
          failed = payroll_run.records.filter(payment_status='failed').count()
          if failed == 0:
              payroll_run.status = 'completed'
          else:
              payroll_run.status = 'failed'  # Has some failures
          payroll_run.save()

  URL Configuration

   **urls.py**

  from django.urls import path, include
  from rest_framework.routers import DefaultRouter
  from .views import PayrollRunViewSet, EmployeePaymentViewSet

  router = DefaultRouter()
  router.register('payroll-runs', PayrollRunViewSet, basename='payroll-run')
  router.register('employees', EmployeePaymentViewSet, basename='employee-payment')

  urlpatterns = [
      path('api/', include(router.urls)),
  ]

  API Endpoints Summary
  ┌────────┬────────────────────────────────────────┬──────────────────────────────────────┐
  │ Method │                Endpoint                │             Description              │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ GET    │ /api/payroll-runs/                     │ List all payroll runs                │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ POST   │ /api/payroll-runs/                     │ Create new payroll run               │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ GET    │ /api/payroll-runs/{id}/                │ Get payroll run details with records │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ POST   │ /api/payroll-runs/{id}/calculate/      │ Calculate payroll for all employees  │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ POST   │ /api/payroll-runs/{id}/approve/        │ Approve payroll for disbursement     │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ POST   │ /api/payroll-runs/{id}/disburse/       │ Trigger salary payments              │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ GET    │ /api/payroll-runs/{id}/payment_status/ │ Get payment progress                 │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ POST   │ /api/payroll-runs/{id}/retry_failed/   │ Retry failed payments                │
  ├────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ PUT    │ /api/employees/{id}/payment_method/    │ Update employee payment method       │
  └────────┴────────────────────────────────────────┴──────────────────────────────────────┘
  Required Dependencies

  ### requirements.txt
  django>=4.2
  djangorestframework>=3.14
  celery>=5.3
  redis>=4.0
  requests>=2.28
  python-decouple>=3.8

  This prompt provides a complete Django REST Framework implementation for the payroll system with:
  - Kenyan statutory deduction calculations (PAYE, NSSF, NHIF, Housing Levy, HELB)
  - Multi-tenant architecture
  - Multiple payment methods (Bank, M-Pesa, Airtel)
  - Async payment processing with Celery
  - Full workflow management (draft → calculated → approved → processing → completed)
