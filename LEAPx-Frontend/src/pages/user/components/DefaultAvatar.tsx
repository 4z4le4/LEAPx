import React from 'react';

interface DefaultAvatarProps {
    name: string;
}

export const DefaultAvatar: React.FC<DefaultAvatarProps> = ({ name }) => {
    const gradients = [
        'bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-600',
        'bg-gradient-to-br from-cyan-400 via-teal-500 to-cyan-600',
        'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
        'bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-600',
    ];
    
    const initial = name.charAt(0).toUpperCase();
    const colorIndex = name.charCodeAt(0) % gradients.length;
    
    return (
        <div className={`w-full h-full flex items-center justify-center ${gradients[colorIndex]} text-white text-6xl font-black`}>
            {initial}
        </div>
    );
};