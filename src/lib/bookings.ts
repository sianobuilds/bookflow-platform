export type Booking = { id:string; customer:string; email:string; service:string; date:string; time:string; status:"Confirmed"|"Cancelled"; duration:number };
export type Slot = {time:string;available:boolean};
export const industries=["Beauty & Wellness","Accommodation","Medical & Clinics","Fitness & Sports","Education","Space Rental","Restaurants","Professional Services","Custom Business"];
export const services=[{name:"Consultation",price:50,duration:60},{name:"Private Session",price:80,duration:60},{name:"Group Class",price:35,duration:90}];
async function request<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch(`/api/${path}`,{...options,cache:"no-store",headers:{"Content-Type":"application/json",...options?.headers}});
 const data=await response.json();
 if(!response.ok) throw new Error(data.detail||"Request failed");
 return data as T;
}
export const getBookings=()=>request<Booking[]>("bookings");
export const getAvailability=(date:string,service:string)=>request<Slot[]>(`availability?date=${encodeURIComponent(date)}&service=${encodeURIComponent(service)}`);
export const createBooking=(booking:{customer:string;email:string;service:string;date:string;time:string})=>request<Booking>("bookings",{method:"POST",body:JSON.stringify(booking)});
export const cancelBooking=(id:string)=>request<{status:string}>(`bookings/${encodeURIComponent(id)}/cancel`,{method:"PATCH"});
