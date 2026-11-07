import {shell} from '../shell';
export default function Page(){return <div dangerouslySetInnerHTML={{__html:shell}}/>}
