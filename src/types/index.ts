// Client types
export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  createdAt: Date;
  lastInteraction?: Date;
  lastPurchase?: Date;
}

// Pet types
export type FurType = 'curto' | 'medio' | 'longo';
export type Species = 'cachorro' | 'gato' | 'outro';
export type PetSize = 'pequeno' | 'medio' | 'grande';
export type PreferredService = 'banho' | 'banho_tosa';
export type GroomingType = 'banho' | 'banho_tosa' | 'tosa_baby' | 'tosa_higienica' | 'tosa_padrao' | 'tosa_tesoura' | 'tosa_maquina';

// Breed data for auto-suggesting size
export interface BreedInfo {
  name: string;
  suggestedSize: PetSize;
}

export interface Pet {
  id: string;
  clientId: string;
  name: string;
  species: Species;
  breed: string;
  size: PetSize;
  furType: FurType;
  weight?: number;
  photoUrl?: string;
  // Service preferences
  preferredService?: PreferredService;
  groomingType?: GroomingType;
  notes?: string;
}

// Grooming (Banho & Tosa) types
export type GroomingService = 'banho' | 'banho_tosa';
export type AppointmentStatus = 'agendado' | 'em_atendimento' | 'pronto' | 'finalizado';

export interface GroomingAppointment {
  id: string;
  clientId: string;
  petId: string;
  service: GroomingService;
  status: AppointmentStatus;
  scheduledAt: Date;
  price: number;
  notes?: string;
}

// Hotel types
export type HotelStatus = 'reservado' | 'check_in' | 'hospedado' | 'check_out';

export interface HotelBooking {
  id: string;
  clientId: string;
  petId: string;
  checkIn: Date;
  checkOut: Date;
  dailyRate: number;
  totalPrice: number;
  status: HotelStatus;
  notes?: string;
}

// Plan types
export type PlanType = 'avulso' | 'plano_4' | 'plano_8';

export interface Plan {
  id: string;
  clientId: string;
  type: PlanType;
  totalBaths: number;
  usedBaths: number;
  remainingBaths: number;
  validUntil: Date;
  price: number;
  createdAt: Date;
}

// Sales types
export type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito';
export type SaleType = 'banho' | 'hotelzinho' | 'plano' | 'adicional';

export interface Sale {
  id: string;
  clientId: string;
  type: SaleType;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  issueNF: boolean;
  createdAt: Date;
}

// WhatsApp types
export type MessageSource = 'ia' | 'humano';
export type ConversationStatus = 'novo' | 'em_atendimento' | 'finalizado' | 'ia_ativa' | 'humano_ativo' | 'pausada';

export interface WhatsAppMessage {
  id: string;
  clientId: string;
  conversationId: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  source: MessageSource;
  timestamp: Date;
}

export interface WhatsAppConversation {
  id: string;
  clientId: string;
  clientName: string;
  clientWhatsapp: string;
  status: ConversationStatus;
  aiEnabled: boolean;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  registrationComplete: boolean;
}

// Dashboard stats
export interface DashboardStats {
  todayAppointments: number;
  activeHotelGuests: number;
  pendingMessages: number;
  monthlyRevenue: number;
  appointmentsTrend: number;
  hotelTrend: number;
  messagesTrend: number;
  revenueTrend: number;
}

// Webhook events
export type WebhookEvent = 
  | 'novo_cliente'
  | 'novo_pet'
  | 'pet_atualizado'
  | 'preferencia_servico_definida'
  | 'tipo_tosa_alterado'
  | 'novo_agendamento'
  | 'pet_pronto'
  | 'plano_utilizado'
  | 'venda_registrada'
  | 'ia_pausada'
  | 'ia_retomada'
  | 'importacao_concluida';

export interface WebhookPayload {
  event: WebhookEvent;
  data: Record<string, unknown>;
  timestamp: Date;
}
