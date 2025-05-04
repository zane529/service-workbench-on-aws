import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useParams } from 'react-router-dom';

export default function WebShellPage() {
    const terminalRef = useRef();
    const term = useRef();
    const fitAddon = useRef();
    const { id } = useParams();

    useEffect(() => {
        term.current = new Terminal({ fontSize: 14, cursorBlink: true });
        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.open(terminalRef.current);
        fitAddon.current.fit();

        fetch(`/api/environments/${id}/start-ssm-session`, { method: 'POST' })
            .then(res => res.json())
            .then(session => {
                const ws = new WebSocket(`${session.StreamUrl}?token=${session.TokenValue}`);
                ws.onopen = () => term.current.writeln('Connected to SSM session...');
                ws.onmessage = (event) => term.current.write(event.data);
                term.current.onData(data => ws.send(data));
                ws.onclose = () => term.current.writeln('\r\nSession closed');
            });

        return () => term.current.dispose();
    }, [id]);

    return (
        <div style={{ height: '100vh', background: '#000' }}>
            <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
} 