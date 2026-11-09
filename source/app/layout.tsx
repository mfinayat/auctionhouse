import {assets} from './asset-manifest';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'AuctionHouse.pk — Property marketplace',icons:{icon:'/favicon.svg'},description:'Explore reviewed property listings, transparent bidding and seller negotiation on AuctionHouse.pk.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><meta name="theme-color" content="#f6f6f2"/><link rel="stylesheet" href={assets.siteCSS}/></head><body>{children}<script src={assets.siteJS} defer /></body></html>}
