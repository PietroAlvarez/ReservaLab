import { CommonModule } from "@angular/common";
import { Component, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { MessageService, ConfirmationService } from "primeng/api";
import { AvatarModule } from "primeng/avatar";
import { BadgeModule } from "primeng/badge";
import { ButtonModule } from "primeng/button";
import { DatePickerModule } from "primeng/datepicker";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { SelectModule } from "primeng/select";
import { InputTextModule } from "primeng/inputtext";
import { TextareaModule } from "primeng/textarea";
import { ProgressBarModule } from "primeng/progressbar";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { TooltipModule } from "primeng/tooltip";

type ViewName = "overview" | "tasks" | "inventory" | "tablets" | "network" | "reservations";
type ReservationStatus = "Confirmada" | "Pendiente" | "Cancelada";
type TaskStatus = "Pendiente" | "En progreso" | "Completada";
type TabletStatus = "Disponible" | "Prestada" | "En revisión";

interface Reservation {
  id: number;
  date: string;
  block: string;
  course: string;
  teacher: string;
  lab: string;
  status: ReservationStatus;
}

interface SupportTask {
  id: number;
  title: string;
  area: string;
  owner: string;
  priority: "Alta" | "Media" | "Baja";
  status: TaskStatus;
  progress: number;
}

interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  status: "Operativo" | "En revisión" | "Fuera de servicio";
  updated: string;
}

interface TabletDevice {
  id: string;
  model: string;
  serial: string;
  mac: string;
  androidVersion: string;
  status: TabletStatus;
  location: string;
  assignee: string;
  lastSeen: string;
  managementProvider: "Headwind MDM" | "Microsoft Intune";
}

interface TabletLoan {
  id: number;
  tabletId: string;
  borrower: string;
  course: string;
  date: string;
  block: string;
  status: "Activo" | "Devuelto";
}

interface NetworkOverview {
  configured: boolean;
  connected: boolean;
  readOnly: boolean;
  source: string;
  status: string;
  sites: number;
  totalDevices: number;
  offlineDevices: number;
  pendingUpdates: number;
  wifiClients: number;
  wiredClients: number;
  wanUptime: number;
  siteNames: string[];
  permissions: string[];
  lastSync: string | null;
  message: string;
}

interface TabletFleetSummary {
  totalDevices: number;
  compliantDevices: number;
  attentionRequired: number;
  installedApps: number;
  unapprovedApps: number;
  outdatedApps: number;
  enforcementMode: string;
  message: string;
}

interface WorkspaceData {
  reservations: Reservation[];
  tasks: SupportTask[];
  assets: Asset[];
  tablets: TabletDevice[];
  tabletLoans: TabletLoan[];
}

interface WorkspaceStateResponse {
  data: WorkspaceData;
  updatedAt: string;
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    AvatarModule,
    BadgeModule,
    ButtonModule,
    DatePickerModule,
    CardModule,
    ConfirmDialogModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    ProgressBarModule,
    TableModule,
    TagModule,
    ToastModule,
    ToolbarModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  activeView: ViewName = "overview";
  theme: "light" | "dark" = "light";
  sidebarCollapsed = false;
  mobileMenuOpen = false;
  isMobileView = window.matchMedia("(max-width: 900px)").matches;
  reservationDialog = false;
  taskDialog = false;
  assetDialog = false;
  tabletDialog = false;
  tabletLoanDialog = false;
  reservationFilter = "Todas";
  inventoryFilter = "Todos";
  tabletFilter = "Todas";
  networkLoading = false;
  networkOverview: NetworkOverview | null = null;
  networkError = "";
  tabletFleetSummary: TabletFleetSummary | null = null;
  tabletBackendAvailable = false;
  workspaceBackendAvailable = false;
  workspaceUpdatedAt: string | null = null;

  private readonly apiBaseUrl = window.location.port === "4300" ? "http://localhost:8084/api" : "/api";

  readonly navigation = [
    { id: "overview" as const, label: "Resumen", icon: "pi pi-home" },
    { id: "tasks" as const, label: "Tareas TI", icon: "pi pi-check-square" },
    { id: "inventory" as const, label: "Inventario", icon: "pi pi-desktop" },
    { id: "tablets" as const, label: "Tablets", icon: "pi pi-tablet" },
    { id: "network" as const, label: "Red UniFi", icon: "pi pi-wifi" },
    { id: "reservations" as const, label: "Reservas", icon: "pi pi-calendar" },
  ];

  readonly statusOptions = ["Todas", "Confirmada", "Pendiente", "Cancelada"];
  readonly inventoryOptions = ["Todos", "Operativo", "En revisión", "Fuera de servicio"];
  readonly assetCategories = ["Computador", "Notebook", "Proyector", "Red", "Audio y video", "Otro"];
  readonly blocks = ["08:00–09:30", "09:45–11:15", "11:30–13:00", "14:00–15:30"];
  readonly courses = ["5° Básico A", "6° Básico B", "7° Básico A", "8° Básico B", "1° Medio A", "2° Medio B"];
  readonly labs = ["Laboratorio Norte", "Laboratorio Central", "Aula móvil"];
  readonly taskAreas = ["Redes", "Equipamiento", "Cuentas", "Audio y video", "Software"];
  readonly priorities = ["Alta", "Media", "Baja"];
  readonly tabletStatusOptions = ["Todas", "Disponible", "Prestada", "En revisión"];

  reservations: Reservation[] = [
    { id: 1041, date: "2026-08-17", block: "08:00–09:30", course: "7° Básico A", teacher: "Camila Rojas", lab: "Laboratorio Central", status: "Confirmada" },
    { id: 1042, date: "2026-08-17", block: "09:45–11:15", course: "1° Medio A", teacher: "Tomás Silva", lab: "Laboratorio Norte", status: "Confirmada" },
    { id: 1043, date: "2026-08-18", block: "11:30–13:00", course: "6° Básico B", teacher: "Fernanda Soto", lab: "Laboratorio Central", status: "Pendiente" },
    { id: 1044, date: "2026-08-19", block: "14:00–15:30", course: "2° Medio B", teacher: "Martín Pérez", lab: "Aula móvil", status: "Confirmada" },
    { id: 1045, date: "2026-08-20", block: "09:45–11:15", course: "8° Básico B", teacher: "Daniela Muñoz", lab: "Laboratorio Norte", status: "Pendiente" },
  ];

  tasks: SupportTask[] = [
    { id: 201, title: "Revisar conectividad de la sala 12", area: "Redes", owner: "Pietro Alvarez", priority: "Alta", status: "En progreso", progress: 65 },
    { id: 202, title: "Configurar cuentas de estudiantes nuevos", area: "Cuentas", owner: "Pietro Alvarez", priority: "Media", status: "Pendiente", progress: 15 },
    { id: 203, title: "Actualizar equipos del laboratorio central", area: "Software", owner: "Equipo TI", priority: "Media", status: "En progreso", progress: 40 },
    { id: 204, title: "Probar amplificación del auditorio", area: "Audio y video", owner: "Pietro Alvarez", priority: "Baja", status: "Completada", progress: 100 },
  ];

  assets: Asset[] = [
    { id: "PC-001", name: "Dell OptiPlex 7090", category: "Computador", location: "Lab. Central · Puesto 01", status: "Operativo", updated: "Hoy, 09:20" },
    { id: "PC-014", name: "HP ProDesk 400", category: "Computador", location: "Lab. Norte · Puesto 14", status: "En revisión", updated: "Hoy, 08:45" },
    { id: "PR-003", name: "Epson PowerLite", category: "Proyector", location: "Sala 12", status: "Operativo", updated: "Ayer, 16:10" },
    { id: "SW-002", name: "Cisco CBS250", category: "Red", location: "Rack principal", status: "Operativo", updated: "Ayer, 14:30" },
    { id: "NB-009", name: "Lenovo ThinkPad E14", category: "Notebook", location: "Aula móvil", status: "Fuera de servicio", updated: "14 ago, 11:05" },
  ];

  tablets: TabletDevice[] = [
    { id: "TAB-001", model: "Samsung Galaxy Tab A 8.0 (SM-T295)", serial: "R9WN10001", mac: "84:25:19:10:00:01", androidVersion: "11", status: "Disponible", location: "Carro de tablets", assignee: "", lastSeen: "Hoy, 10:42", managementProvider: "Headwind MDM" },
    { id: "TAB-002", model: "Samsung Galaxy Tab A 8.0 (SM-T295)", serial: "R9WN10002", mac: "84:25:19:10:00:02", androidVersion: "11", status: "Prestada", location: "2° Medio B", assignee: "Docente responsable", lastSeen: "Hoy, 10:38", managementProvider: "Headwind MDM" },
    { id: "TAB-003", model: "Samsung Galaxy Tab A 8.0 (SM-T295)", serial: "R9WN10003", mac: "84:25:19:10:00:03", androidVersion: "11", status: "En revisión", location: "Soporte TI", assignee: "", lastSeen: "Ayer, 16:20", managementProvider: "Headwind MDM" },
    { id: "TAB-004", model: "Samsung Galaxy Tab A 8.0 (SM-T295)", serial: "R9WN10004", mac: "84:25:19:10:00:04", androidVersion: "11", status: "Disponible", location: "Carro de tablets", assignee: "", lastSeen: "Hoy, 10:40", managementProvider: "Headwind MDM" },
  ];

  tabletLoans: TabletLoan[] = [
    { id: 501, tabletId: "TAB-002", borrower: "Docente responsable", course: "2° Medio B", date: "2026-08-16", block: "09:45–11:15", status: "Activo" },
  ];

  newReservation = this.emptyReservation();
  newTask = this.emptyTask();
  newAsset = this.emptyAsset();
  newTablet = this.emptyTablet();
  newTabletLoan = this.emptyTabletLoan();

  constructor(
    private readonly messages: MessageService,
    private readonly confirmation: ConfirmationService,
    private readonly http: HttpClient,
  ) {
    this.theme = document.documentElement.dataset["theme"] === "dark" ? "dark" : "light";
    this.sidebarCollapsed = (localStorage.getItem("centro-ti-sidebar-collapsed") || localStorage.getItem("reservalab-sidebar-collapsed")) === "true";
    this.restoreDemoData();
    this.loadWorkspaceData();
    this.loadTabletFleetSummary();
  }

  get todayLabel(): string {
    const value = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  get persistenceLabel(): string {
    return this.workspaceBackendAvailable ? "Servidor" : "Este equipo";
  }

  get synchronizationLabel(): string {
    if (!this.workspaceUpdatedAt) return this.workspaceBackendAvailable ? "Conectado" : "Modo local";
    return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" })
      .format(new Date(this.workspaceUpdatedAt));
  }

  get themeActionLabel(): string {
    return this.theme === "light" ? "Activar modo oscuro" : "Activar modo claro";
  }

  get sidebarToggleLabel(): string {
    if (this.isMobileView) {
      return this.mobileMenuOpen ? "Cerrar menú" : "Abrir menú";
    }
    return this.sidebarCollapsed ? "Mostrar barra lateral" : "Ocultar barra lateral";
  }

  get sidebarToggleIcon(): string {
    if (this.isMobileView) {
      return this.mobileMenuOpen ? "pi pi-times" : "pi pi-bars";
    }
    return this.sidebarCollapsed ? "pi pi-angle-right" : "pi pi-angle-left";
  }

  get pageTitle(): string {
    return this.navigation.find((item) => item.id === this.activeView)?.label ?? "Centro de Mando TI";
  }

  get filteredReservations(): Reservation[] {
    return this.reservationFilter === "Todas"
      ? this.reservations
      : this.reservations.filter((item) => item.status === this.reservationFilter);
  }

  get filteredAssets(): Asset[] {
    return this.inventoryFilter === "Todos"
      ? this.assets
      : this.assets.filter((item) => item.status === this.inventoryFilter);
  }

  get filteredTablets(): TabletDevice[] {
    return this.tabletFilter === "Todas"
      ? this.tablets
      : this.tablets.filter((item) => item.status === this.tabletFilter);
  }

  get availableTabletOptions(): { label: string; value: string }[] {
    return this.tablets
      .filter((item) => item.status === "Disponible")
      .map((item) => ({ label: `${item.id} · ${item.model}`, value: item.id }));
  }

  get confirmedReservations(): number {
    return this.reservations.filter((item) => item.status === "Confirmada").length;
  }

  get openTasks(): number {
    return this.tasks.filter((item) => item.status !== "Completada").length;
  }

  get operationalAssets(): number {
    return this.assets.filter((item) => item.status === "Operativo").length;
  }

  get assetsInReview(): number {
    return this.assets.filter((item) => item.status === "En revisión").length;
  }

  get assetsOutOfService(): number {
    return this.assets.filter((item) => item.status === "Fuera de servicio").length;
  }

  get labAvailability(): number {
    return 82;
  }

  get availableTablets(): number {
    return this.tablets.filter((item) => item.status === "Disponible").length;
  }

  get loanedTablets(): number {
    return this.tablets.filter((item) => item.status === "Prestada").length;
  }

  get tabletsInMaintenance(): number {
    return this.tablets.filter((item) => item.status === "En revisión").length;
  }

  selectView(view: ViewName): void {
    this.activeView = view;
    this.mobileMenuOpen = false;
    if (view === "network") this.loadNetworkOverview();
    if (view === "tablets") this.loadTabletFleetSummary();
  }

  loadNetworkOverview(): void {
    this.networkLoading = true;
    this.networkError = "";
    this.http.get<NetworkOverview>(`${this.apiBaseUrl}/network/overview`).subscribe({
      next: (overview) => {
        this.networkOverview = overview;
        this.networkLoading = false;
      },
      error: () => {
        this.networkOverview = null;
        this.networkLoading = false;
        this.networkError = "El backend todavía no está iniciado en este equipo.";
      },
    });
  }

  loadTabletFleetSummary(): void {
    this.http.get<TabletFleetSummary>(`${this.apiBaseUrl}/tablets/summary`).subscribe({
      next: (summary) => {
        this.tabletFleetSummary = summary;
        this.tabletBackendAvailable = true;
      },
      error: () => {
        this.tabletBackendAvailable = false;
      },
    });
  }

  loadWorkspaceData(): void {
    this.http.get<WorkspaceStateResponse | null>(`${this.apiBaseUrl}/workspace`).subscribe({
      next: (response) => {
        this.workspaceBackendAvailable = true;
        if (response?.data) {
          this.applyWorkspaceData(response.data);
          this.workspaceUpdatedAt = response.updatedAt;
          this.persistLocalCopy();
        } else {
          this.persistDemoData();
        }
      },
      error: () => {
        this.workspaceBackendAvailable = false;
      },
    });
  }

  networkStatusSeverity(): "success" | "warn" | "danger" | "info" {
    if (!this.networkOverview?.configured) return "info";
    if (!this.networkOverview.connected) return "danger";
    return this.networkOverview.offlineDevices > 0 ? "warn" : "success";
  }

  formatSyncTime(value: string | null): string {
    if (!value) return "Sin sincronización";
    return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
  }

  toggleSidebar(): void {
    if (this.isMobileView) {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      return;
    }

    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem("centro-ti-sidebar-collapsed", String(this.sidebarCollapsed));
  }

  @HostListener("window:resize")
  onViewportChange(): void {
    const nextIsMobileView = window.matchMedia("(max-width: 900px)").matches;
    if (!nextIsMobileView) {
      this.mobileMenuOpen = false;
    }
    this.isMobileView = nextIsMobileView;
  }

  toggleTheme(): void {
    this.theme = this.theme === "light" ? "dark" : "light";
    document.documentElement.dataset["theme"] = this.theme;
    document.documentElement.classList.toggle("app-dark", this.theme === "dark");
    localStorage.setItem("centro-ti-theme", this.theme);
    this.messages.add({
      severity: "info",
      summary: this.theme === "dark" ? "Modo oscuro activado" : "Modo claro activado",
      detail: "El Centro de Mando TI recordará esta preferencia.",
    });
  }

  showReservationDialog(): void {
    this.newReservation = this.emptyReservation();
    this.reservationDialog = true;
  }

  saveReservation(): void {
    if (!this.newReservation.date || !this.newReservation.block || !this.newReservation.course || !this.newReservation.teacher || !this.newReservation.lab) {
      this.messages.add({ severity: "warn", summary: "Faltan datos", detail: "Completa todos los campos de la reserva." });
      return;
    }

    const date = this.toDateKey(this.newReservation.date);
    this.reservations = [
      ...this.reservations,
      {
        id: Math.max(...this.reservations.map((item) => item.id)) + 1,
        date,
        block: this.newReservation.block,
        course: this.newReservation.course,
        teacher: this.newReservation.teacher,
        lab: this.newReservation.lab,
        status: "Pendiente",
      },
    ];
    this.persistDemoData();
    this.reservationDialog = false;
    this.messages.add({ severity: "success", summary: "Solicitud registrada", detail: "La reserva quedó pendiente de aprobación." });
  }

  approveReservation(item: Reservation): void {
    item.status = "Confirmada";
    this.reservations = [...this.reservations];
    this.persistDemoData();
    this.messages.add({ severity: "success", summary: "Reserva confirmada", detail: `${item.course} · ${item.block}` });
  }

  cancelReservation(item: Reservation): void {
    this.confirmation.confirm({
      header: "Cancelar reserva",
      message: `¿Quieres cancelar la reserva de ${item.course}?`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí, cancelar",
      rejectLabel: "Volver",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        item.status = "Cancelada";
        this.reservations = [...this.reservations];
        this.persistDemoData();
        this.messages.add({ severity: "info", summary: "Reserva cancelada", detail: "El bloque volvió a quedar disponible." });
      },
    });
  }

  showTaskDialog(): void {
    this.newTask = this.emptyTask();
    this.taskDialog = true;
  }

  saveTask(): void {
    if (!this.newTask.title || !this.newTask.area || !this.newTask.priority) {
      this.messages.add({ severity: "warn", summary: "Faltan datos", detail: "Completa título, área y prioridad." });
      return;
    }
    this.tasks = [
      ...this.tasks,
      {
        id: Math.max(...this.tasks.map((item) => item.id)) + 1,
        title: this.newTask.title,
        area: this.newTask.area,
        priority: this.newTask.priority as "Alta" | "Media" | "Baja",
        owner: "Pietro Alvarez",
        status: "Pendiente",
        progress: 0,
      },
    ];
    this.persistDemoData();
    this.taskDialog = false;
    this.messages.add({ severity: "success", summary: "Tarea creada", detail: "Se agregó a la cola de soporte TI." });
  }

  advanceTask(item: SupportTask): void {
    if (item.status === "Pendiente") {
      item.status = "En progreso";
      item.progress = 45;
    } else {
      item.status = "Completada";
      item.progress = 100;
    }
    this.tasks = [...this.tasks];
    this.persistDemoData();
    this.messages.add({ severity: "success", summary: "Tarea actualizada", detail: item.status });
  }

  showAssetDialog(): void {
    this.newAsset = this.emptyAsset();
    this.assetDialog = true;
  }

  saveAsset(): void {
    const id = this.newAsset.id.trim().toUpperCase();
    if (!id || !this.newAsset.name.trim() || !this.newAsset.category || !this.newAsset.location.trim()) {
      this.messages.add({ severity: "warn", summary: "Faltan datos", detail: "Completa código, nombre, categoría y ubicación." });
      return;
    }
    if (this.assets.some((asset) => asset.id.toUpperCase() === id)) {
      this.messages.add({ severity: "warn", summary: "Activo duplicado", detail: `El código ${id} ya existe.` });
      return;
    }
    this.assets = [...this.assets, {
      ...this.newAsset,
      id,
      name: this.newAsset.name.trim(),
      location: this.newAsset.location.trim(),
      updated: "Ahora",
    }];
    this.persistDemoData();
    this.assetDialog = false;
    this.messages.add({ severity: "success", summary: "Activo registrado", detail: `${id} se agregó al inventario.` });
  }

  cycleAssetStatus(asset: Asset): void {
    const nextStatus: Record<Asset["status"], Asset["status"]> = {
      Operativo: "En revisión",
      "En revisión": "Fuera de servicio",
      "Fuera de servicio": "Operativo",
    };
    asset.status = nextStatus[asset.status];
    asset.updated = "Ahora";
    this.assets = [...this.assets];
    this.persistDemoData();
    this.messages.add({ severity: "info", summary: "Estado actualizado", detail: `${asset.id} · ${asset.status}` });
  }

  showTabletDialog(): void {
    this.newTablet = this.emptyTablet();
    this.tabletDialog = true;
  }

  saveTablet(): void {
    const id = this.newTablet.id.trim().toUpperCase();
    if (!id || !this.newTablet.serial.trim() || !this.newTablet.mac.trim()) {
      this.messages.add({ severity: "warn", summary: "Faltan datos", detail: "Completa código, serie y dirección MAC." });
      return;
    }
    if (this.tablets.some((item) => item.id === id || item.serial === this.newTablet.serial.trim())) {
      this.messages.add({ severity: "warn", summary: "Tablet duplicada", detail: "El código o número de serie ya está registrado." });
      return;
    }
    this.tablets = [...this.tablets, { ...this.newTablet, id, serial: this.newTablet.serial.trim(), mac: this.newTablet.mac.trim().toUpperCase() }];
    this.persistDemoData();
    this.tabletDialog = false;
    this.messages.add({ severity: "success", summary: "Tablet registrada", detail: `${id} quedó disponible en el inventario.` });
  }

  showTabletLoanDialog(): void {
    this.newTabletLoan = this.emptyTabletLoan();
    this.tabletLoanDialog = true;
  }

  saveTabletLoan(): void {
    if (!this.newTabletLoan.tabletId || !this.newTabletLoan.borrower.trim() || !this.newTabletLoan.course || !this.newTabletLoan.date || !this.newTabletLoan.block) {
      this.messages.add({ severity: "warn", summary: "Faltan datos", detail: "Completa tablet, responsable, curso, fecha y bloque." });
      return;
    }
    const tablet = this.tablets.find((item) => item.id === this.newTabletLoan.tabletId);
    if (!tablet || tablet.status !== "Disponible") {
      this.messages.add({ severity: "warn", summary: "Tablet no disponible", detail: "Selecciona otro dispositivo." });
      return;
    }
    tablet.status = "Prestada";
    tablet.assignee = this.newTabletLoan.borrower.trim();
    tablet.location = this.newTabletLoan.course;
    this.tabletLoans = [...this.tabletLoans, {
      id: Math.max(500, ...this.tabletLoans.map((item) => item.id)) + 1,
      tabletId: tablet.id,
      borrower: tablet.assignee,
      course: this.newTabletLoan.course,
      date: this.toDateKey(this.newTabletLoan.date),
      block: this.newTabletLoan.block,
      status: "Activo",
    }];
    this.tablets = [...this.tablets];
    this.persistDemoData();
    this.tabletLoanDialog = false;
    this.messages.add({ severity: "success", summary: "Préstamo registrado", detail: `${tablet.id} fue asignada a ${tablet.assignee}.` });
  }

  returnTablet(tablet: TabletDevice): void {
    const loan = [...this.tabletLoans].reverse().find((item) => item.tabletId === tablet.id && item.status === "Activo");
    if (loan) loan.status = "Devuelto";
    tablet.status = "Disponible";
    tablet.assignee = "";
    tablet.location = "Carro de tablets";
    this.tablets = [...this.tablets];
    this.tabletLoans = [...this.tabletLoans];
    this.persistDemoData();
    this.messages.add({ severity: "success", summary: "Devolución completada", detail: `${tablet.id} está disponible nuevamente.` });
  }

  sendTabletToMaintenance(tablet: TabletDevice): void {
    tablet.status = "En revisión";
    tablet.assignee = "";
    tablet.location = "Soporte TI";
    this.tasks = [...this.tasks, {
      id: Math.max(...this.tasks.map((item) => item.id)) + 1,
      title: `Revisar tablet ${tablet.id}`,
      area: "Equipamiento",
      owner: "Pietro Alvarez",
      priority: "Media",
      status: "Pendiente",
      progress: 0,
    }];
    this.tablets = [...this.tablets];
    this.persistDemoData();
    this.messages.add({ severity: "info", summary: "Enviada a mantenimiento", detail: "Se creó una tarea de soporte vinculada." });
  }

  resetDemo(): void {
    localStorage.removeItem("reservalab-primeng-demo");
    this.http.delete(`${this.apiBaseUrl}/workspace`).subscribe({
      next: () => window.location.reload(),
      error: () => window.location.reload(),
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat("es-CL", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
  }

  reservationSeverity(status: ReservationStatus): "success" | "warn" | "danger" {
    return status === "Confirmada" ? "success" : status === "Pendiente" ? "warn" : "danger";
  }

  taskSeverity(status: TaskStatus): "success" | "info" | "warn" {
    return status === "Completada" ? "success" : status === "En progreso" ? "info" : "warn";
  }

  prioritySeverity(priority: SupportTask["priority"]): "danger" | "warn" | "info" {
    return priority === "Alta" ? "danger" : priority === "Media" ? "warn" : "info";
  }

  assetSeverity(status: Asset["status"]): "success" | "warn" | "danger" {
    return status === "Operativo" ? "success" : status === "En revisión" ? "warn" : "danger";
  }

  assetIcon(category: string): string {
    const icons: Record<string, string> = {
      Computador: "pi pi-desktop",
      Notebook: "pi pi-laptop",
      Proyector: "pi pi-video",
      Red: "pi pi-sitemap",
    };
    return icons[category] ?? "pi pi-box";
  }

  tabletSeverity(status: TabletStatus): "success" | "info" | "warn" {
    return status === "Disponible" ? "success" : status === "Prestada" ? "info" : "warn";
  }

  private emptyReservation(): { date: Date | null; block: string; course: string; teacher: string; lab: string; notes: string } {
    return { date: null, block: "", course: "", teacher: "", lab: "", notes: "" };
  }

  private emptyTask(): { title: string; area: string; priority: string; notes: string } {
    return { title: "", area: "", priority: "Media", notes: "" };
  }

  private emptyAsset(): Asset {
    return { id: "", name: "", category: "Computador", location: "", status: "Operativo", updated: "Ahora" };
  }

  private emptyTablet(): TabletDevice {
    return { id: "", model: "Samsung Galaxy Tab A 8.0 (SM-T295)", serial: "", mac: "", androidVersion: "11", status: "Disponible", location: "Carro de tablets", assignee: "", lastSeen: "Sin conexión registrada", managementProvider: "Headwind MDM" };
  }

  private emptyTabletLoan(): { tabletId: string; borrower: string; course: string; date: Date | null; block: string } {
    return { tabletId: "", borrower: "", course: "", date: new Date(), block: "" };
  }

  private toDateKey(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private persistDemoData(): void {
    const data = this.workspaceData();
    this.persistLocalCopy(data);
    this.http.put<WorkspaceStateResponse>(`${this.apiBaseUrl}/workspace`, data).subscribe({
      next: (response) => {
        this.workspaceBackendAvailable = true;
        this.workspaceUpdatedAt = response.updatedAt;
      },
      error: () => {
        this.workspaceBackendAvailable = false;
      },
    });
  }

  private restoreDemoData(): void {
    const stored = localStorage.getItem("reservalab-primeng-demo");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Partial<WorkspaceData>;
      if (parsed.reservations) this.reservations = parsed.reservations;
      if (parsed.tasks) this.tasks = parsed.tasks;
      if (parsed.assets) this.assets = parsed.assets;
      if (parsed.tablets) {
        this.tablets = parsed.tablets.map((tablet) => ({
          ...tablet,
          managementProvider: tablet.managementProvider === ("Servidor Linux" as TabletDevice["managementProvider"])
            ? "Headwind MDM"
            : tablet.managementProvider,
        }));
      }
      if (parsed.tabletLoans) this.tabletLoans = parsed.tabletLoans;
    } catch {
      localStorage.removeItem("reservalab-primeng-demo");
    }
  }

  private workspaceData(): WorkspaceData {
    return {
      reservations: this.reservations,
      tasks: this.tasks,
      assets: this.assets,
      tablets: this.tablets,
      tabletLoans: this.tabletLoans,
    };
  }

  private applyWorkspaceData(data: WorkspaceData): void {
    this.reservations = Array.isArray(data.reservations) ? data.reservations : this.reservations;
    this.tasks = Array.isArray(data.tasks) ? data.tasks : this.tasks;
    this.assets = Array.isArray(data.assets) ? data.assets : this.assets;
    this.tablets = Array.isArray(data.tablets)
      ? data.tablets.map((tablet) => ({
          ...tablet,
          managementProvider: tablet.managementProvider === ("Servidor Linux" as TabletDevice["managementProvider"])
            ? "Headwind MDM"
            : tablet.managementProvider,
        }))
      : this.tablets;
    this.tabletLoans = Array.isArray(data.tabletLoans) ? data.tabletLoans : this.tabletLoans;
  }

  private persistLocalCopy(data: WorkspaceData = this.workspaceData()): void {
    localStorage.setItem("reservalab-primeng-demo", JSON.stringify(data));
  }
}
