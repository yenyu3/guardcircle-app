declare module "react-native-get-sms-android" {
  export interface SmsFilter {
    box?: "inbox" | "sent" | "draft" | "outbox" | "failed" | "queued" | "all";
    read?: 0 | 1;
    _id?: number;
    address?: string;
    body?: string;
    indexFrom?: number;
    maxCount?: number;
    sortOrder?: "ASC" | "DESC";
  }

  export interface SmsObject {
    _id: number;
    thread_id: number;
    address: string;
    person: number | null;
    date: number;
    date_sent: number;
    protocol: number;
    read: number;
    status: number;
    type: number;
    body: string;
    service_center: string;
    locked: number;
    error_code: number;
    sub_id: number;
    seen: number;
    deletable: number;
    sim_slot: number;
    hidden: number;
    app_id: number;
    msg_id: number;
    reserved: number;
    pri: number;
    teleservice_id: number;
    svc_cmd: number;
    roam_pending: number;
    spam_report: number;
    secret_mode: number;
    safe_message: number;
  }

  const SmsAndroid: {
    list(
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void,
    ): void;

    delete(
      id: number,
      fail: (error: string) => void,
      success: (status: boolean) => void,
    ): void;
  };

  export default SmsAndroid;
}
